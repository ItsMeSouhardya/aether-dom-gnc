"""Proposal review decisions are durable and separate from canonical command history."""

import copy
import json
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Barrier
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, select

from app import repository as repository_module
from app.commands import CommandError
from app.contracts import SCHEMA_ROOT, load_fixture
from app.main import create_app
from app.persistence.tables import branches, commands, snapshots
from app.repository import Repository
from tests.test_stage_api import BASE, authored, command

PROJECT = "proj_neon_shogun"
BRANCH = "branch_main"
PROPOSALS = BASE + "/agent-proposals"


@pytest.mark.parametrize("decision", ["create", "approve", "reject"])
def test_invalid_final_review_metadata_never_persists_or_changes_canon(
    tmp_path: Path,
    monkeypatch,
    decision: str,
):
    repository = Repository(tmp_path / "final-record.sqlite3")
    repository.initialize()
    try:
        existing = (
            [] if decision == "create" else [repository.create_proposal(PROJECT, BRANCH, request())]
        )
        before = repository.get(PROJECT, BRANCH)

        class InvalidTimestamp:
            @classmethod
            def now(cls, timezone):
                return cls()

            def isoformat(self):
                # Each persisted metadata update must pass the whole-record schema.
                return "x" * 4097

        monkeypatch.setattr(repository_module, "datetime", InvalidTimestamp)
        with pytest.raises(CommandError) as failure:
            if decision == "create":
                repository.create_proposal(PROJECT, BRANCH, request())
            elif decision == "approve":
                repository.execute(PROJECT, BRANCH, approval(existing[0]))
            else:
                repository.reject_proposal(PROJECT, BRANCH, existing[0]["proposalId"])
        assert failure.value.status == 422
        assert repository.get(PROJECT, BRANCH) == before
        assert repository.list_proposals(PROJECT, BRANCH) == existing
        with repository.engine.connect() as connection:
            assert len(connection.execute(select(snapshots)).all()) == 1
            assert connection.execute(select(commands)).all() == []
    finally:
        repository.close()


@pytest.mark.parametrize("decision", ["oversized", "approve", "reject"])
def test_metadata_boundary_fixture_stays_within_contract_for_full_review_lifecycle(
    tmp_path: Path,
    decision: str,
):
    fixture = json.loads(
        (SCHEMA_ROOT / "fixtures" / "proposal-metadata-boundary.json").read_text(encoding="utf-8")
    )
    document = load_fixture()
    document["layers"] = [
        copy.deepcopy(node["value"])
        for node in fixture["proposal"]["contextNodes"]
        if node["kind"] == "layer"
    ]
    document["shots"][0]["layerIds"] = [layer["id"] for layer in document["layers"]]
    if decision != "oversized":
        for layer in document["layers"]:
            layer["pose"] = "x" * fixture["safeBeforePoseLength"]
    path = tmp_path / "metadata-boundary.sqlite3"
    repository = Repository(path)
    repository.initialize()
    try:
        with repository.engine.begin() as connection:
            connection.execute(snapshots.update().values(document=document))
    finally:
        repository.close()

    class BoundaryProvider:
        name = "local_mock"
        model_version = fixture["proposal"]["modelVersion"]

        def generate(self, context):
            return json.dumps(fixture["providerResponse"])

    with TestClient(create_app(path, proposal_provider=BoundaryProvider())) as client:
        before = client.get(BASE + "/document").json()
        response = client.post(PROPOSALS, json=fixture["request"])
        if decision == "oversized":
            assert response.status_code == 422
            assert client.get(PROPOSALS).json() == {"proposals": []}
            assert client.get(BASE + "/document").json() == before
            return
        assert response.status_code == 200, response.text
        proposal = response.json()
        if decision == "approve":
            payload = approval(proposal)
            payload["actor"]["id"] = "\0" * 128
            payload["commandId"] = "\0" * 128
            result = client.post(BASE + "/commands", json=payload)
            assert result.status_code == 200, result.text
            assert result.json()["document"]["project"]["revision"] == 1
        else:
            result = client.post(PROPOSALS + "/" + proposal["proposalId"] + "/reject", json={})
            assert result.status_code == 200, result.text
            assert client.get(BASE + "/document").json() == before
        reviewed = client.get(PROPOSALS).json()["proposals"][0]
        assert reviewed["status"] == ("approved" if decision == "approve" else "rejected")
        assert (
            len(json.dumps(reviewed, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
            <= 131072
        )


def request(revision=0, **overrides):
    return {
        "requestId": "request_" + uuid4().hex,
        "expectedRevision": revision,
        "scopeIds": ["layer_kael"],
        "allowedOps": ["setLayerPose"],
        "intent": "repair_pose",
        "message": "Repair the selected pose",
        **overrides,
    }


def approval(proposal, revision=None):
    return command(
        proposal["baseRevision"] if revision is None else revision,
        "approveProposal",
        proposal["proposalId"],
    )


def propose(client, payload=None):
    response = client.post(PROPOSALS, json=payload or request())
    assert response.status_code == 200, response.text
    assert response.headers["cache-control"] == "no-store"
    return response.json()


def test_generate_reject_and_retry_preserve_canon_across_restart(tmp_path: Path):
    path = tmp_path / "proposal.sqlite3"
    payload = request()
    with TestClient(create_app(path, asset_root=tmp_path)) as client:
        before = client.get(BASE + "/document").json()
        assert client.get(PROPOSALS).json() == {"proposals": []}
        proposal = propose(client, payload)
        assert proposal["status"] == "pending_review"
        assert proposal["baseRevision"] == 0
        assert proposal["schemaVersionBefore"] == "0.1.0"
        assert propose(client, payload) == proposal
        assert client.get(BASE + "/document").json() == before
        rejected = client.post(PROPOSALS + "/" + proposal["proposalId"] + "/reject", json={})
        assert rejected.status_code == 200
        assert rejected.headers["cache-control"] == "no-store"
        record = rejected.json()
        assert record["status"] == "rejected"
        assert record["reviewedAt"] and record["approvalCommandId"] is None
        assert (
            client.post(PROPOSALS + "/" + proposal["proposalId"] + "/reject", json={}).json()
            == record
        )
        assert client.get(BASE + "/document").json() == before
    with TestClient(create_app(path, asset_root=tmp_path)) as client:
        assert propose(client, payload) == record
        assert client.get(PROPOSALS).json() == {"proposals": [record]}
        denied = client.post(BASE + "/commands", json=approval(record))
        assert denied.status_code == 409
        assert client.get(BASE + "/document").json() == before


def test_approval_is_one_audited_revision_and_replay_survives_undo_restart(tmp_path: Path):
    path = tmp_path / "approved.sqlite3"
    with TestClient(create_app(path, asset_root=tmp_path)) as client:
        before = client.get(BASE + "/document").json()["document"]
        proposal = propose(client)
        payload = approval(proposal)
        response = client.post(BASE + "/commands", json=payload)
        assert response.status_code == 200, response.text
        result = response.json()
        assert result["document"]["project"]["revision"] == 1
        assert result["document"]["layers"][1]["pose"] == "lifting_with_right_arm"
        assert result["receipt"]["op"] == "approveProposal"
        assert result["receipt"]["targetId"] == proposal["proposalId"]
        assert result["receipt"]["proposalId"] == proposal["proposalId"]
        assert set(result["receipt"]["changedEntityIds"]) == {"layer_kael", "char_kael"}
        assert len(result["history"]["entries"]) == 1
        assert client.post(BASE + "/commands", json=payload).json() == result
        approved = client.get(PROPOSALS).json()["proposals"][0]
        assert approved["status"] == "approved"
        assert approved["reviewedBy"] == payload["actor"]["id"]
        assert approved["approvalCommandId"] == payload["commandId"]
        assert (
            client.post(PROPOSALS + "/" + proposal["proposalId"] + "/reject", json={}).status_code
            == 409
        )
        duplicate = approval(proposal, 1)
        duplicate["commandId"] = "another_approval"
        assert client.post(BASE + "/commands", json=duplicate).status_code == 409
        undone = client.post(BASE + "/commands", json=command(1, "undo")).json()
        assert authored(undone["document"]) == authored(before)
        assert client.get(PROPOSALS).json()["proposals"][0] == approved
    with TestClient(create_app(path, asset_root=tmp_path)) as client:
        assert client.post(BASE + "/commands", json=payload).json() == result
        redone = client.post(BASE + "/commands", json=command(2, "redo")).json()
        assert authored(redone["document"]) == authored(result["document"])
        assert client.get(PROPOSALS).json()["proposals"][0] == approved


def test_stale_request_and_stale_approval_never_write(tmp_path: Path):
    with TestClient(create_app(tmp_path / "stale.sqlite3")) as client:
        proposal = propose(client)
        assert (
            client.post(
                BASE + "/commands", json=command(0, "setLayerTransform", "layer_sign", x=0.5)
            ).status_code
            == 200
        )
        before = client.get(BASE + "/document").json()
        assert client.post(PROPOSALS, json=request()).status_code == 409
        assert client.post(BASE + "/commands", json=approval(proposal)).status_code == 409
        assert client.post(BASE + "/commands", json=approval(proposal, 1)).status_code == 409
        assert client.get(BASE + "/document").json() == before
        assert client.get(PROPOSALS).json()["proposals"][0]["status"] == "pending_review"


def test_request_id_conflicts_and_rejection_body_are_strict(tmp_path: Path):
    with TestClient(create_app(tmp_path / "identity.sqlite3")) as client:
        payload = request()
        proposal = propose(client, payload)
        assert client.post(PROPOSALS, json={**payload, "message": "different"}).status_code == 409
        before = client.get(BASE + "/document").json()
        path = PROPOSALS + "/" + proposal["proposalId"] + "/reject"
        for body in ({"operations": []}, [], None):
            assert client.post(path, json=body).status_code == 422
        assert client.post(PROPOSALS + "/missing/reject", json={}).status_code == 404
        assert client.get(PROPOSALS.replace("branch_main", "missing")).status_code == 404
        assert client.get(BASE + "/document").json() == before


class BatchProvider:
    name = "local_mock"
    model_version = "test-batch-1"

    def generate(self, context):
        return json.dumps(
            {
                "operations": [
                    {
                        "op": "setLayerPose",
                        "targetId": "layer_kael",
                        "args": {"pose": "lifting_with_right_arm"},
                    },
                    {"op": "setShotTension", "targetId": "shot_rooftop", "args": {"tension": 0.8}},
                ],
                "evidenceNodeIds": ["layer_kael"],
                "explanation": "Two selected edits",
            }
        )


def test_multi_operation_batch_undo_restores_absent_fields_and_schema(tmp_path: Path):
    with TestClient(
        create_app(tmp_path / "batch.sqlite3", proposal_provider=BatchProvider())
    ) as client:
        before = client.get(BASE + "/document").json()["document"]
        proposal = propose(
            client,
            request(
                scopeIds=["layer_kael", "shot_rooftop"],
                allowedOps=["setLayerPose", "setShotTension"],
            ),
        )
        assert proposal["schemaVersionAfter"] == "0.3.0"
        result = client.post(BASE + "/commands", json=approval(proposal)).json()
        assert result["document"]["shots"][0]["audio"] == {"tension": 0.8}
        assert result["document"]["project"]["revision"] == 1
        assert set(result["receipt"]["changedEntityIds"]) == {
            "layer_kael",
            "char_kael",
            "shot_rooftop",
        }
        restored = client.post(BASE + "/commands", json=command(1, "undo")).json()
        assert authored(restored["document"]) == authored(before)
        assert client.get(PROPOSALS).json()["proposals"][0]["status"] == "approved"


def test_head_change_during_generation_does_not_store_proposal(tmp_path: Path):
    path = tmp_path / "provider.sqlite3"
    writer = Repository(path)
    writer.initialize()

    class RacingProvider(BatchProvider):
        def generate(self, context):
            writer.execute(PROJECT, BRANCH, command(0, "setLayerTransform", "layer_sign", x=0.4))
            return super().generate(context)

    try:
        with TestClient(create_app(path, proposal_provider=RacingProvider())) as client:
            response = client.post(
                PROPOSALS,
                json=request(
                    scopeIds=["layer_kael", "shot_rooftop"],
                    allowedOps=["setLayerPose", "setShotTension"],
                ),
            )
            assert response.status_code == 409
            assert client.get(PROPOSALS).json() == {"proposals": []}
            assert writer.get(PROJECT, BRANCH)["document"]["project"]["revision"] == 1
    finally:
        writer.close()


@pytest.mark.parametrize("output", ["not json", '{"operations":[]}', "raise"])
def test_unusable_provider_response_never_changes_canon_or_review_history(
    tmp_path: Path, output: str
):
    class UnusableProvider(BatchProvider):
        def generate(self, context):
            if output == "raise":
                raise TimeoutError("private provider failure details")
            return output

    with TestClient(
        create_app(tmp_path / "unusable.sqlite3", proposal_provider=UnusableProvider())
    ) as client:
        before = client.get(BASE + "/document").json()
        response = client.post(PROPOSALS, json=request())
        assert response.status_code == 422
        assert "private provider failure details" not in response.text
        assert client.get(PROPOSALS).json() == {"proposals": []}
        assert client.get(BASE + "/document").json() == before


def test_failure_after_approval_status_write_rolls_back_all_tables(tmp_path: Path):
    repository = Repository(tmp_path / "rollback-proposal.sqlite3")
    repository.initialize()
    try:
        proposal = repository.create_proposal(PROJECT, BRANCH, request())
        before = repository.get(PROJECT, BRANCH)

        def fail_audit(connection, cursor, statement, parameters, context, many):
            if statement.startswith("INSERT INTO commands"):
                raise RuntimeError("Failed audit")

        event.listen(repository.engine, "before_cursor_execute", fail_audit)
        with pytest.raises(RuntimeError, match="Failed audit"):
            repository.execute(PROJECT, BRANCH, approval(proposal))
        event.remove(repository.engine, "before_cursor_execute", fail_audit)
        assert repository.get(PROJECT, BRANCH) == before
        assert repository.list_proposals(PROJECT, BRANCH) == [proposal]
        with repository.engine.connect() as connection:
            assert len(connection.execute(select(snapshots)).all()) == 1
            assert connection.execute(select(commands)).all() == []
            assert connection.execute(select(branches.c.undo_stack)).scalar_one() == []
    finally:
        repository.close()


def test_concurrent_approval_and_rejection_have_one_winner(tmp_path: Path):
    path = tmp_path / "race.sqlite3"
    first, second = Repository(path), Repository(path)
    first.initialize()
    second.initialize()
    try:
        proposal = first.create_proposal(PROJECT, BRANCH, request())
        barrier = Barrier(2)

        def act(repository, approve):
            barrier.wait(timeout=5)
            try:
                return (
                    repository.execute(PROJECT, BRANCH, approval(proposal))
                    if approve
                    else repository.reject_proposal(PROJECT, BRANCH, proposal["proposalId"])
                )
            except CommandError as error:
                return error.status

        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(act, first, True), pool.submit(act, second, False)]
            results = [future.result(timeout=10) for future in futures]
        assert sum(isinstance(result, dict) for result in results) == 1
        assert 409 in results
        record = first.list_proposals(PROJECT, BRANCH)[0]
        assert first.get(PROJECT, BRANCH)["document"]["project"]["revision"] == (
            1 if record["status"] == "approved" else 0
        )
    finally:
        first.close()
        second.close()


@pytest.mark.parametrize("same_command_id", [True, False])
def test_concurrent_approvals_never_apply_twice(tmp_path: Path, same_command_id: bool):
    path = tmp_path / "approval-race.sqlite3"
    first, second = Repository(path), Repository(path)
    first.initialize()
    second.initialize()
    try:
        proposal = first.create_proposal(PROJECT, BRANCH, request())
        payloads = [approval(proposal), approval(proposal)]
        if not same_command_id:
            payloads[1]["commandId"] = "independent_approval"
        barrier = Barrier(2)

        def approve(repository, payload):
            barrier.wait(timeout=5)
            try:
                return repository.execute(PROJECT, BRANCH, payload)
            except CommandError as error:
                return error.status

        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [
                pool.submit(approve, repository, payload)
                for repository, payload in zip([first, second], payloads, strict=True)
            ]
            results = [future.result(timeout=10) for future in futures]
        if same_command_id:
            assert results[0] == results[1]
        else:
            assert sum(isinstance(result, dict) for result in results) == 1
            assert 409 in results
        assert first.get(PROJECT, BRANCH)["document"]["project"]["revision"] == 1
        assert first.list_proposals(PROJECT, BRANCH)[0]["status"] == "approved"
        with first.engine.connect() as connection:
            assert len(connection.execute(select(commands)).all()) == 1
            assert len(connection.execute(select(snapshots)).all()) == 2
    finally:
        first.close()
        second.close()


@pytest.mark.parametrize("field", ["allowedOps", "diff", "operations"])
def test_approval_revalidates_stored_permissions_operations_and_diff(tmp_path: Path, field: str):
    from app.persistence.tables import agent_proposals

    repository = Repository(tmp_path / "tampered.sqlite3")
    repository.initialize()
    try:
        proposal = repository.create_proposal(PROJECT, BRANCH, request())
        damaged = copy.deepcopy(proposal)
        if field == "allowedOps":
            damaged[field] = ["setLayerTransform"]
        elif field == "diff":
            damaged[field][0]["after"] = "unreviewed value"
        else:
            damaged[field][0]["targetId"] = "layer_vance"
        with repository.engine.begin() as connection:
            connection.execute(agent_proposals.update().values(record=damaged))
        before = repository.get(PROJECT, BRANCH)
        with pytest.raises(CommandError) as failure:
            repository.execute(PROJECT, BRANCH, approval(proposal))
        assert failure.value.status == 422
        assert repository.get(PROJECT, BRANCH) == before
        assert repository.list_proposals(PROJECT, BRANCH)[0]["status"] == "pending_review"
    finally:
        repository.close()


def test_same_request_race_inserts_one_record(tmp_path: Path):
    barrier = Barrier(2)

    class ConcurrentProvider(BatchProvider):
        def generate(self, context):
            barrier.wait(timeout=5)
            return super().generate(context)

    path = tmp_path / "request-race.sqlite3"
    repositories = [Repository(path, proposal_provider=ConcurrentProvider()) for _ in range(2)]
    for repository in repositories:
        repository.initialize()
    try:
        payload = request(
            scopeIds=["layer_kael", "shot_rooftop"], allowedOps=["setLayerPose", "setShotTension"]
        )
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [
                pool.submit(repository.create_proposal, PROJECT, BRANCH, payload)
                for repository in repositories
            ]
            results = [future.result(timeout=10) for future in futures]
        assert results[0] == results[1]
        assert repositories[0].list_proposals(PROJECT, BRANCH) == [results[0]]
        assert repositories[0].get(PROJECT, BRANCH)["document"] == load_fixture()
    finally:
        for repository in repositories:
            repository.close()


def test_latest_twenty_proposals_without_canonical_snapshots(tmp_path: Path):
    repository = Repository(tmp_path / "latest.sqlite3")
    repository.initialize()
    try:
        records = [repository.create_proposal(PROJECT, BRANCH, request()) for _ in range(22)]
        assert repository.list_proposals(PROJECT, BRANCH) == list(reversed(records[-20:]))
        with repository.engine.connect() as connection:
            assert len(connection.execute(select(snapshots)).all()) == 1
            assert connection.execute(select(commands)).all() == []
    finally:
        repository.close()


def test_migration_from_0001_preserves_all_snapshots_and_command_audit(tmp_path: Path):
    path = tmp_path / "old-database.sqlite3"
    repository = Repository(path)
    repository.initialize()
    repository.execute(PROJECT, BRANCH, command(0, "setLayerTransform", "layer_kael", x=0.2))
    before = repository.get(PROJECT, BRANCH)
    repository.close()
    # Model an existing pre-proposal database without modifying canonical tables.
    with sqlite3.connect(path) as connection:
        connection.execute("DROP TABLE branch_forks")
        connection.execute("DROP TABLE agent_proposals")
        connection.execute("UPDATE alembic_version SET version_num = '0001'")
        old_tables = {
            table: connection.execute(f"SELECT * FROM {table}").fetchall()
            for table in ("branches", "snapshots", "commands")
        }
    reopened = Repository(path)
    reopened.initialize()
    try:
        assert reopened.get(PROJECT, BRANCH) == before
        assert reopened.list_proposals(PROJECT, BRANCH) == []
        with sqlite3.connect(path) as connection:
            assert connection.execute("SELECT version_num FROM alembic_version").fetchone() == (
                "0003",
            )
            for table, rows in old_tables.items():
                assert connection.execute(f"SELECT * FROM {table}").fetchall() == rows
        undone = reopened.execute(PROJECT, BRANCH, command(1, "undo"))
        assert authored(undone["document"]) == load_fixture()
    finally:
        reopened.close()
