import sqlite3

import pytest

from app.presentation_workspace import Gate, backup, inspect_database, restore, safe_path, safe_tree


def test_shared_owners_exclude_maintenance_and_release(tmp_path):
    with Gate(tmp_path, exclusive=False), Gate(tmp_path, exclusive=False):
        with pytest.raises(RuntimeError, match="owners|maintenance"):
            with Gate(tmp_path, exclusive=True):
                pass
    with Gate(tmp_path, exclusive=True):
        with pytest.raises(RuntimeError):
            with Gate(tmp_path, exclusive=False):
                pass


def test_database_integrity_and_historical_missing_reference(tmp_path):
    db = tmp_path / "workspace.sqlite3"
    with sqlite3.connect(db) as connection:
        connection.execute("create table snapshots(document text)")
        connection.execute("insert into snapshots values (?)", ('{"uri":"assets/old.svg"}',))
    with pytest.raises(RuntimeError, match="Missing historical"):
        inspect_database(db, tmp_path)
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets/old.svg").write_text("original")
    assert inspect_database(db, tmp_path)["references"] == ["assets/old.svg"]


def test_tree_rejects_hardlinks(tmp_path):
    import os

    (tmp_path / "a").write_text("source")
    os.link(tmp_path / "a", tmp_path / "b")
    with pytest.raises(RuntimeError, match="standalone"):
        safe_tree(tmp_path)


@pytest.mark.parametrize("version", ["0.4.0", "0.5.0", "0.6.0"])
def test_mock_proposal_accepts_current_saved_document_versions(version):
    from app.contracts import load_fixture
    from app.proposal_domain import prepare_proposal, validate_proposal_record
    from app.proposal_provider import MockProposalProvider

    document = load_fixture()
    document["schemaVersion"] = version
    result = prepare_proposal(
        document,
        {
            "requestId": "presentation_probe",
            "expectedRevision": 0,
            "scopeIds": ["layer_kael"],
            "allowedOps": ["setLayerPose"],
            "intent": "repair_pose",
            "message": "Original fixture mock",
        },
        MockProposalProvider(),
    )
    validate_proposal_record(
        {
            **result,
            "proposalId": "presentation_proposal",
            "projectId": "proj_neon_shogun",
            "branchId": "branch_main",
            "baseRevision": 0,
            "scopeIds": ["layer_kael"],
            "allowedOps": ["setLayerPose"],
            "intent": "repair_pose",
            "message": "Original fixture mock",
            "status": "pending_review",
            "createdAt": "2026-11-15T00:00:00+00:00",
            "reviewedAt": None,
            "reviewedBy": None,
            "approvalCommandId": None,
        }
    )


@pytest.mark.parametrize("journal", ["delete", "wal"])
def test_online_backup_restores_history_branches_jobs_and_media(tmp_path, journal):
    source, copied, restored = [tmp_path / name for name in ["source", "backup", "restored"]]
    for root in [source, copied, restored]:
        root.mkdir()
    (source / "assets").mkdir()
    (source / "assets/old.svg").write_text("historical original")
    with sqlite3.connect(source / "workspace.sqlite3") as connection:
        connection.execute(f"pragma journal_mode={journal}")
        for table in ["snapshots", "commands", "branches", "jobs"]:
            connection.execute(f"create table {table}(record text)")
            connection.execute(
                f"insert into {table} values (?)", ('{"sourceUri":"assets/old.svg"}',)
            )
    expected = inspect_database(source / "workspace.sqlite3", source)
    assert backup(source, copied) == expected
    assert restore(restored, copied) == expected
    assert inspect_database(restored / "workspace.sqlite3", restored) == expected


def test_backup_refuses_live_cooperating_owner_before_copy(tmp_path):
    destination = tmp_path / "output"
    destination.mkdir()
    with Gate(tmp_path):
        with pytest.raises(RuntimeError, match="owners"):
            backup(tmp_path, destination)
    assert not list(destination.iterdir())


def test_external_sqlite_write_contention_is_finite(tmp_path):
    source, destination = tmp_path / "source", tmp_path / "backup"
    source.mkdir()
    destination.mkdir()
    database = source / "workspace.sqlite3"
    with sqlite3.connect(database) as connection:
        connection.execute("create table history(value text)")
    writer = sqlite3.connect(database)
    try:
        writer.execute("BEGIN IMMEDIATE")
        with pytest.raises(sqlite3.OperationalError, match="locked"):
            backup(source, destination)
    finally:
        writer.close()
    assert not list(destination.iterdir())


def test_corrupt_content_addressed_media_and_database_are_rejected(tmp_path):
    with sqlite3.connect(tmp_path / "workspace.sqlite3") as connection:
        connection.execute("create table history(value text)")
    assets = tmp_path / "assets"
    assets.mkdir()
    (assets / ("a" * 64 + ".txt")).write_text("tampered evidence")
    with pytest.raises(RuntimeError, match="hash mismatch"):
        inspect_database(tmp_path / "workspace.sqlite3", tmp_path)
    (tmp_path / "corrupt.sqlite3").write_bytes(b"corrupted sqlite")
    with pytest.raises(sqlite3.DatabaseError):
        inspect_database(tmp_path / "corrupt.sqlite3", tmp_path)


def test_visible_directory_redirect_is_refused(tmp_path):
    import os

    target, link = tmp_path / "external", tmp_path / "alias"
    target.mkdir()
    if os.name == "nt":
        import subprocess

        subprocess.run(
            ["cmd", "/c", "mklink", "/J", str(link), str(target)], check=True, capture_output=True
        )
    else:
        link.symlink_to(target, target_is_directory=True)
    with pytest.raises(RuntimeError, match="Redirect"):
        safe_path(link / "media")


def test_repository_owner_gate_covers_idle_lifetime_before_initialization(tmp_path, monkeypatch):
    from app import presentation_workspace
    from app.repository import Repository

    monkeypatch.setattr(presentation_workspace, "ROOT", tmp_path)
    monkeypatch.setenv("AETHER_PRESENTATION_WORKSPACE", "owned")
    root = tmp_path / "data/presentation/workspaces/owned"
    root.mkdir(parents=True)
    with pytest.raises(RuntimeError, match="fixed workspace paths"):
        Repository(tmp_path / "regular.sqlite3", root)
    assert not (tmp_path / "regular.sqlite3").exists()
    repository = Repository(root / "workspace.sqlite3", root)
    try:
        # Even before the first migration/seed or command, an idle owner excludes maintenance.
        with pytest.raises(RuntimeError, match="owners"):
            with Gate(root, exclusive=True):
                pass
        repository.initialize()
        with Gate(root):  # API and explicit worker can coexist.
            pass
    finally:
        repository.close()
    with Gate(root, exclusive=True):
        pass


def test_v6_job_stages_reviews_approves_and_undoes_without_losing_hotspots(tmp_path):
    from app.job_repository import JobRepository
    from app.job_worker import run_once
    from app.repository import Repository

    repository = Repository(tmp_path / "workspace.sqlite3", tmp_path)
    project, branch = "proj_neon_shogun", "branch_main"
    try:
        repository.initialize()

        def execute(revision, op, target=None, args=None):
            value = {
                "commandId": f"v6_job_{revision}",
                "projectId": project,
                "branchId": branch,
                "expectedRevision": revision,
                "actor": {"kind": "human", "id": "reviewer"},
                "reason": "Explicit fixture mock review",
                "op": op,
            }
            if target is not None:
                value.update(targetId=target, args=args or {})
            return repository.execute(project, branch, value)

        execute(
            0,
            "setLoreHotspot",
            "shot_rooftop",
            {
                "hotspot": {
                    "id": "saved_marker",
                    "label": "Kael",
                    "targetKind": "character",
                    "targetId": "char_kael",
                    "positions": {"16:9": {"x": 0.3, "y": 0.5}, "9:16": {"x": 0.5, "y": 0.3}},
                }
            },
        )
        before = repository.get(project, branch)["document"]
        queue = JobRepository(repository)
        job = queue.enqueue(
            project,
            branch,
            {
                "requestId": "v6_mock_job",
                "expectedRevision": 1,
                "scopeIds": ["layer_kael"],
                "allowedOps": ["setLayerPose"],
                "intent": "repair_pose",
                "message": "Mock only",
            },
        )
        assert run_once(repository)
        assert repository.get(project, branch)["document"] == before
        proposal = queue.result(project, branch, job["jobId"])
        assert proposal["schemaVersionBefore"] == "0.6.0"
        approved = execute(1, "approveProposal", proposal["proposalId"])["document"]
        assert approved["shots"][0]["hotspots"] == before["shots"][0]["hotspots"]
        assert queue.result(project, branch, job["jobId"])["status"] == "approved"
        restored = execute(2, "undo")["document"]
        assert restored["layers"] == before["layers"]
        assert restored["shots"] == before["shots"]
        assert restored["schemaVersion"] == "0.6.0"
    finally:
        repository.close()


@pytest.mark.parametrize(
    "damage",
    ["unrelated", "schema", "identity", "snapshot", "project", "branch", "revision", "canon"],
)
def test_prepared_verifier_refuses_unprepared_or_inconsistent_state_read_only(
    tmp_path,
    monkeypatch,
    damage,
):
    import hashlib
    import json

    from app.contracts import load_fixture
    from app.presentation_workspace import ROOT, main
    from app.repository import Repository

    database = tmp_path / "workspace.sqlite3"
    for asset in load_fixture()["assets"]:
        target = tmp_path / asset["uri"]
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes((ROOT / asset["uri"]).read_bytes())
    if damage == "unrelated":
        with sqlite3.connect(database) as connection:
            connection.execute("create table unrelated(value text)")
    else:
        repository = Repository(database, tmp_path)
        repository.initialize()
        repository.close()
    project, branch = "proj_neon_shogun", "branch_main"
    with sqlite3.connect(database) as connection:
        if damage == "schema":
            connection.execute("drop table jobs")
        if damage == "identity":
            project, branch = "missing_project", "missing_branch"
        if damage == "snapshot":
            connection.execute("delete from snapshots")
        if damage in {"project", "branch", "revision", "canon"}:
            document = json.loads(
                connection.execute("select document from snapshots").fetchone()[0]
            )
            if damage == "project":
                document["project"]["id"] = "different_project"
            elif damage == "branch":
                document["project"]["activeBranchId"] = "different_branch"
            elif damage == "revision":
                document["project"]["revision"] = 10
            else:
                document["shots"][0]["durationMs"] = -1
            connection.execute("update snapshots set document=?", (json.dumps(document),))
    (tmp_path / "workspace.json").write_text(json.dumps({"projectId": project, "branchId": branch}))
    before = hashlib.sha256(database.read_bytes()).hexdigest()
    with sqlite3.connect(database) as connection:
        dump_before = list(connection.iterdump())
    monkeypatch.setattr("sys.argv", ["presentation_workspace", "inspect", "--root", str(tmp_path)])
    with pytest.raises(RuntimeError, match="application|project|branch|snapshot|canonical"):
        main()
    assert hashlib.sha256(database.read_bytes()).hexdigest() == before
    with sqlite3.connect(database) as connection:
        assert list(connection.iterdump()) == dump_before


def test_prepared_verifier_accepts_current_edit_without_initial_head_comparison(
    tmp_path,
    monkeypatch,
    capsys,
):
    import json

    from app.contracts import load_fixture
    from app.presentation_workspace import ROOT, main
    from app.repository import Repository

    for asset in load_fixture()["assets"]:
        target = tmp_path / asset["uri"]
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes((ROOT / asset["uri"]).read_bytes())
    repository = Repository(tmp_path / "workspace.sqlite3", tmp_path)
    try:
        repository.initialize()
        repository.execute(
            "proj_neon_shogun",
            "branch_main",
            {
                "commandId": "legitimate_edit",
                "projectId": "proj_neon_shogun",
                "branchId": "branch_main",
                "expectedRevision": 0,
                "op": "setShotTension",
                "targetId": "shot_rooftop",
                "args": {"tension": 0.8},
                "actor": {"kind": "human", "id": "creator"},
                "reason": "Normal saved edit",
            },
        )
    finally:
        repository.close()
    (tmp_path / "workspace.json").write_text(
        json.dumps(
            {"projectId": "proj_neon_shogun", "branchId": "branch_main", "initialRevision": 0}
        )
    )
    before = (tmp_path / "workspace.sqlite3").read_bytes()
    monkeypatch.setattr("sys.argv", ["presentation_workspace", "inspect", "--root", str(tmp_path)])
    main()
    result = json.loads(capsys.readouterr().out)
    assert result["application"]["revision"] == 1
    assert (tmp_path / "workspace.sqlite3").read_bytes() == before
