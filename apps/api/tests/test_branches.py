"""Forks are durable isolated creations; comparisons never mutate either branch."""

import copy
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, select
from test_commands import command
from test_proposal_api import request as proposal_request

from app.commands import CommandError
from app.main import create_app
from app.persistence.tables import branch_forks, branches, commands, snapshots
from app.repository import Repository

PROJECT = "proj_neon_shogun"
MAIN = "branch_main"
BASE = f"/api/v1/projects/{PROJECT}"


def fork(new: str = "branch_alt", source: str = MAIN, revision: int = 0, **extra: Any):
    return {"commandId": f"fork_{new}", "op": "forkBranch", "projectId": PROJECT,
            "sourceBranchId": source, "expectedRevision": revision, "newBranchId": new,
            "name": "Alternate 夜", "actor": {"kind": "human", "id": "creator_1"},
            "reason": "Explore another framing", **extra}


def edit(repository, branch: str, revision: int, value: float, op: str = "setLayerTransform"):
    return repository.execute(PROJECT, branch, command(
        revision, op, commandId=f"edit_{branch}_{revision}_{op}", branchId=branch,
        **({"args": {"x": value}} if op == "setLayerTransform" else {}),
    ))


@pytest.fixture
def repository(tmp_path: Path):
    repository = Repository(tmp_path / "branches.sqlite3")
    repository.initialize()
    yield repository
    repository.close()


def test_api_fork_list_and_read_only_diff(tmp_path: Path):
    with TestClient(create_app(tmp_path / "api.sqlite3")) as client:
        original = client.get(BASE + f"/branches/{MAIN}/document").json()
        response = client.post(BASE + "/branches", json=fork())
        assert response.status_code == 200, response.text
        assert response.headers["cache-control"] == "no-store"
        result = response.json()
        assert result["branch"] == {"id": "branch_alt", "name": "Alternate 夜",
                                    "parentId": MAIN, "baseRevision": 0, "headRevision": 0}
        assert result["receipt"] == {"commandId": "fork_branch_alt", "sourceBranchId": MAIN,
                                     "sourceRevision": 0, "branchId": "branch_alt",
                                     "actor": fork()["actor"], "reason": fork()["reason"],
                                     "createdAt": result["receipt"]["createdAt"]}
        assert client.get(BASE + f"/branches/{MAIN}/document").json() == original
        child = client.get(BASE + "/branches/branch_alt/document").json()
        assert child["history"] == {"canUndo": False, "canRedo": False, "entries": []}
        expected = copy.deepcopy(original["document"])
        expected["project"]["activeBranchId"] = "branch_alt"
        expected["branches"].append(result["branch"])
        assert child["document"] == expected
        listing = client.get(BASE + "/branches")
        assert listing.status_code == 200
        assert listing.headers["cache-control"] == "no-store"
        assert listing.json()["projectId"] == PROJECT
        assert [b["id"] for b in listing.json()["branches"]] == ["branch_alt", MAIN]
        diff = client.get(BASE + f"/diff?left={MAIN}&right=branch_alt")
        assert diff.status_code == 200, diff.text
        assert diff.headers["cache-control"] == "no-store"
        assert diff.json() == {"projectId": PROJECT, "base": {"branchId": MAIN, "revision": 0},
                               "left": {"branchId": MAIN, "revision": 0},
                               "right": {"branchId": "branch_alt", "revision": 0},
                               "changes": [], "conflictCount": 0}
        assert client.get(BASE + f"/branches/{MAIN}/document").json() == original


def test_fork_at_nonzero_revision_isolated_edit_undo_reload_and_replay(repository):
    source = edit(repository, MAIN, 0, 0.3)
    payload = fork(revision=1)
    result = repository.fork_branch(PROJECT, payload)
    assert result["branch"]["baseRevision"] == 1
    assert repository.get(PROJECT, MAIN)["document"] == source["document"]
    edit(repository, "branch_alt", 1, 0.8)
    assert repository.fork_branch(PROJECT, payload) == result
    assert repository.list_branches(PROJECT)["branches"][0]["headRevision"] == 2
    assert repository.get(PROJECT, MAIN)["history"] == source["history"]
    edit(repository, "branch_alt", 2, 0, "undo")
    child_layers = repository.get(PROJECT, "branch_alt")["document"]["layers"]
    assert child_layers == source["document"]["layers"]
    path = repository.path
    repository.close()
    reopened = Repository(path)
    reopened.initialize()
    assert reopened.fork_branch(PROJECT, payload) == result
    assert reopened.get(PROJECT, "branch_alt")["document"]["project"]["revision"] == 3
    assert reopened.list_proposals(PROJECT, "branch_alt") == []
    reopened.close()


def test_source_proposals_remain_only_on_source(repository):
    proposal = repository.create_proposal(PROJECT, MAIN, proposal_request())
    before = repository.get(PROJECT, MAIN)
    repository.fork_branch(PROJECT, fork())
    assert repository.list_proposals(PROJECT, MAIN) == [proposal]
    assert repository.list_proposals(PROJECT, "branch_alt") == []
    assert repository.get(PROJECT, MAIN) == before


def test_migration_from_0002_preserves_canonical_and_proposal_tables(repository):
    edit(repository, MAIN, 0, 0.4)
    repository.create_proposal(PROJECT, MAIN, proposal_request(expectedRevision=1))
    path = repository.path
    repository.close()
    with sqlite3.connect(path) as connection:
        connection.execute("DROP TABLE branch_forks")
        connection.execute("UPDATE alembic_version SET version_num = '0002'")
        before = {table: connection.execute(f"SELECT * FROM {table}").fetchall()
                  for table in ("branches", "snapshots", "commands", "agent_proposals")}
    reopened = Repository(path)
    reopened.initialize()
    try:
        with sqlite3.connect(path) as connection:
            assert connection.execute("SELECT version_num FROM alembic_version").fetchone() == (
                "0003",
            )
            for table, rows in before.items():
                assert connection.execute(f"SELECT * FROM {table}").fetchall() == rows
        reopened.fork_branch(PROJECT, fork(revision=1))
    finally:
        reopened.close()


@pytest.mark.parametrize("body", ["{", "null", "[]", '{"op":"forkBranch"}',
                                 '{"expectedRevision":NaN}', '{"expectedRevision":1e999}'])
def test_malformed_fork_json_never_creates_a_branch(tmp_path: Path, body):
    with TestClient(create_app(tmp_path / "invalid-body.sqlite3")) as client:
        response = client.post(BASE + "/branches", content=body,
                               headers={"Content-Type": "application/json"})
        assert response.status_code == 422
        assert response.headers["cache-control"] == "no-store"
        assert len(client.get(BASE + "/branches").json()["branches"]) == 1


def test_fork_is_separate_human_endpoint_and_unknown_project_or_branch_is_missing(tmp_path: Path):
    with TestClient(create_app(tmp_path / "scopes.sqlite3")) as client:
        assert client.post(BASE + f"/branches/{MAIN}/commands", json=fork()).status_code == 422
        assert client.get("/api/v1/projects/missing/branches").status_code == 404
        assert client.get(BASE + f"/diff?left={MAIN}&right=missing").status_code == 404
        response = client.post(BASE + "/branches", json=fork(source="missing"))
        assert response.status_code == 404


@pytest.mark.parametrize("extra", [
    {"name": " "}, {"name": "\u2003\t"}, {"name": "x" * 81}, {"name": "\ud800"},
    {"newBranchId": "../oops"}, {"sourceBranchId": "-bad"}, {"newBranchId": "layer_kael"},
    {"newBranchId": "branch_bad\n"},
    {"actor": {"kind": "agent", "id": "bot"}}, {"expectedRevision": True},
    {"expectedRevision": 9007199254740992}, {"reason": "x" * 501}, {"unexpected": 1},
])
def test_fork_rejects_invalid_contract_or_existing_global_entity(repository, extra):
    before = repository.get(PROJECT, MAIN)
    with pytest.raises(CommandError):
        repository.fork_branch(PROJECT, fork(**extra))
    assert repository.get(PROJECT, MAIN) == before
    with repository.engine.connect() as connection:
        assert len(connection.execute(select(branches)).all()) == 1


def test_fork_stale_scope_collision_and_command_id_reuse(repository):
    edit(repository, MAIN, 0, 0.4)
    for payload in [fork(), fork(revision=1, projectId="other"),
                    fork(revision=1, commandId="edit_branch_main_0_setLayerTransform")]:
        with pytest.raises(CommandError):
            repository.fork_branch(PROJECT, payload)
    repository.fork_branch(PROJECT, fork(revision=1))
    with pytest.raises(CommandError):
        repository.fork_branch(PROJECT, fork(revision=1, name="Changed"))
    with pytest.raises(CommandError):
        repository.fork_branch(PROJECT, fork(revision=1, commandId="another"))
    with pytest.raises(CommandError, match="another payload"):
        repository.execute(PROJECT, MAIN, command(1, commandId="fork_branch_alt"))


def test_fork_rolls_back_snapshot_branch_and_audit(repository):
    def fail(connection, cursor, statement, parameters, context, many):
        if statement.startswith("INSERT INTO branch_forks"):
            raise RuntimeError("audit failed")
    event.listen(repository.engine, "before_cursor_execute", fail)
    with pytest.raises(RuntimeError, match="audit failed"):
        repository.fork_branch(PROJECT, fork())
    event.remove(repository.engine, "before_cursor_execute", fail)
    with repository.engine.connect() as connection:
        assert len(connection.execute(select(branches)).all()) == 1
        assert len(connection.execute(select(snapshots)).all()) == 1
        assert not connection.execute(select(commands)).all()
    repository.fork_branch(PROJECT, fork())


def test_concurrent_forks_and_identical_replay(repository):
    def run(payload):
        worker = Repository(repository.path)
        try:
            return worker.fork_branch(PROJECT, payload)
        finally:
            worker.close()
    with ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(run, [fork(), fork(), fork("branch_other")]))
    assert results[0] == results[1]
    assert len(repository.list_branches(PROJECT)["branches"]) == 3
    assert repository.get(PROJECT, MAIN)["document"]["project"]["revision"] == 0


def test_concurrent_fork_and_edit_cannot_share_a_command_id(repository):
    def run(payload):
        worker = Repository(repository.path)
        try:
            if payload["op"] == "forkBranch":
                return worker.fork_branch(PROJECT, payload)
            return worker.execute(PROJECT, MAIN, payload)
        except CommandError as error:
            return error.detail["code"]
        finally:
            worker.close()
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(run, [fork(commandId="shared_id"), command(commandId="shared_id")]))
    assert sum(isinstance(value, dict) for value in results) == 1
    assert "COMMAND_ID_REUSED" in results


@pytest.mark.parametrize("corruption", ["cycle", "missing_parent", "wrong_revision",
                                       "missing_snapshot", "metadata_mismatch"])
def test_corrupt_lineage_rejects_instead_of_fabricating_base(repository, corruption):
    repository.fork_branch(PROJECT, fork())
    with repository.engine.begin() as connection:
        if corruption in ("cycle", "missing_parent", "wrong_revision"):
            value = {"cycle": {"source_branch_id": "branch_alt"},
                     "missing_parent": {"source_branch_id": "missing"},
                     "wrong_revision": {"source_revision": 99}}[corruption]
            connection.execute(branch_forks.update().values(**value))
        elif corruption == "missing_snapshot":
            connection.execute(snapshots.delete().where(snapshots.c.branch_id == MAIN))
        else:
            document = repository.get(PROJECT, "branch_alt")["document"]
            document["branches"][-1]["name"] = "Rewritten"
            connection.execute(snapshots.update().where(
                snapshots.c.branch_id == "branch_alt",
            ).values(document=document))
    with pytest.raises(CommandError) as error:
        repository.diff_branches(PROJECT, MAIN, "branch_alt")
    assert error.value.status == 409


def test_independent_roots_have_no_fabricated_common_base(repository):
    document = repository.get(PROJECT, MAIN)["document"]
    document["project"]["activeBranchId"] = "separate"
    document["branches"] = [{"id": "separate", "name": "Separate", "parentId": None,
                              "baseRevision": 0, "headRevision": 0}]
    with repository.engine.begin() as connection:
        connection.execute(branches.insert().values(project_id=PROJECT, branch_id="separate",
                                                    revision=0, undo_stack=[], redo_stack=[]))
        connection.execute(snapshots.insert().values(project_id=PROJECT, branch_id="separate",
                                                     revision=0, document=document))
    with pytest.raises(CommandError) as error:
        repository.diff_branches(PROJECT, MAIN, "separate")
    assert error.value.detail["code"] == "NO_COMMON_BASE"


def test_fork_branch_count_limit_is_atomic(repository):
    for index in range(63):
        repository.fork_branch(PROJECT, fork(f"branch_{index}"))
    before = repository.get(PROJECT, MAIN)
    with pytest.raises(CommandError) as error:
        repository.fork_branch(PROJECT, fork("branch_excess"))
    assert error.value.detail["code"] == "BRANCH_LIMIT"
    assert len(repository.list_branches(PROJECT)["branches"]) == 64
    assert repository.get(PROJECT, MAIN) == before


def test_common_base_siblings_nested_ancestor_same_branch(repository):
    edit(repository, MAIN, 0, 0.1)
    repository.fork_branch(PROJECT, fork("branch_a", revision=1))
    edit(repository, MAIN, 1, 0.2)
    repository.fork_branch(PROJECT, fork("branch_b", revision=2))
    edit(repository, "branch_a", 1, 0.6)
    repository.fork_branch(PROJECT, fork("branch_c", "branch_a", 2))
    edit(repository, "branch_a", 2, 0.7)
    cases = [("branch_a", "branch_b", MAIN, 1),
             ("branch_c", "branch_b", MAIN, 1),
             (MAIN, "branch_c", MAIN, 1),
             ("branch_c", "branch_a", "branch_a", 2),
             ("branch_a", "branch_a", "branch_a", 3)]
    for left, right, base, revision in cases:
        before = [repository.get(PROJECT, b) for b in [left, right]]
        diff = repository.diff_branches(PROJECT, left, right)
        assert diff["base"] == {"branchId": base, "revision": revision}
        assert [repository.get(PROJECT, b) for b in [left, right]] == before
        if left == right:
            assert diff["changes"] == []
    diff = repository.diff_branches(PROJECT, "branch_a", "branch_b")
    assert diff["conflictCount"] == 1
    assert diff["changes"] == [{"collection": "layers", "entityId": "layer_kael",
                                "path": "/transform/x", "basePresent": True,
                                "leftPresent": True, "rightPresent": True,
                                "base": 0.1, "left": 0.7, "right": 0.2, "status": "conflict"}]


@pytest.mark.parametrize("suffix", ["?left=branch_main",
                                    "?left=branch_main&right=branch_main&base=0",
                                    "?left=branch_main&left=branch_main&right=branch_main",
                                    "?left=-bad&right=branch_main"])
def test_diff_rejects_invalid_queries(tmp_path: Path, suffix):
    with TestClient(create_app(tmp_path / "bad.sqlite3")) as client:
        assert client.get(BASE + "/diff" + suffix).status_code == 422
