"""Revision-bound diagnostics and reversible authored continuity repairs."""

import copy
import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator
from sqlalchemy import create_engine, select

from app import main
from app.contracts import SCHEMA_ROOT, load_fixture
from app.persistence.tables import commands, snapshots

BASE = "/api/v1/projects/proj_neon_shogun/branches/branch_main"


def command(revision: int = 0, op: str = "setLayerPose", **changes: Any) -> dict[str, Any]:
    payload = {
        "commandId": f"repair_{revision}_{op}", "projectId": "proj_neon_shogun",
        "branchId": "branch_main", "expectedRevision": revision,
        "actor": {"kind": "human", "id": "creator"}, "reason": "Review continuity",
        "op": op,
    }
    if op == "setLayerPose":
        payload.update(targetId="layer_kael", args={"pose": "lifting_with_right_arm"})
    elif op == "setLayerTransform":
        payload.update(targetId="layer_kael", args={"x": 0.12})
    elif op == "recordConstraintRecovery":
        payload.update(targetId="constraint_kael_left_arm", args={
            "eventId": "event_recovery", "sceneId": "scene_rooftop", "order": 2,
            "description": "Kael's left arm recovers before the confrontation.",
        })
    return payload | changes


@pytest.fixture
def client(tmp_path: Path):
    with TestClient(main.create_app(tmp_path / "repairs.sqlite3")) as client:
        yield client


def get(client: TestClient) -> dict[str, Any]:
    response = client.get(BASE + "/document")
    assert response.status_code == 200, response.text
    return response.json()


def execute(client: TestClient, payload: dict[str, Any]) -> dict[str, Any]:
    response = client.post(BASE + "/commands", json=payload)
    assert response.status_code == 200, response.text
    assert response.headers["cache-control"] == "no-store"
    result = response.json()
    assert result["analysis"]["revision"] == result["document"]["project"]["revision"]
    assert result["analysis"]["invalidation"]["changedEntityIds"] == sorted(
        result["receipt"]["changedEntityIds"],
    )
    return result


def authored(document: dict[str, Any]) -> dict[str, Any]:
    result = copy.deepcopy(document)
    result["project"]["revision"] = 0
    result["branches"][0]["headRevision"] = 0
    return result


def conflicts(result: dict[str, Any]) -> list[dict[str, Any]]:
    return [issue for issue in result["analysis"]["issues"]
            if issue["subjectId"] == "layer_kael" and any(
                item["entityId"] == "constraint_kael_left_arm" for item in issue["evidence"]
            )]


def test_seed_analysis_has_linked_physical_evidence_and_diagnostics_route(
    client: TestClient,
) -> None:
    result = get(client)
    assert result["analysis"]["revision"] == 0
    issue = conflicts(result)[0]
    assert issue["code"] == "CANON_PHYSICAL_CONFLICT"
    assert {"constraint_kael_left_arm", "event_injury"} <= {
        item["entityId"] for item in issue["evidence"]
    }
    assert issue["path"] and all(item["path"] for item in issue["evidence"])
    response = client.get(BASE + "/diagnostics")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json() == result["analysis"]
    schema = json.loads((SCHEMA_ROOT / "analysis.schema.json").read_text(encoding="utf-8"))
    Draft202012Validator(schema).validate(result["analysis"])


def test_pose_repair_and_null_restore_exactly_through_undo_redo(client: TestClient) -> None:
    original = get(client)["document"]
    repaired = execute(client, command())
    assert repaired["document"]["layers"][1]["pose"] == "lifting_with_right_arm"
    assert conflicts(repaired) == []
    assert set(repaired["receipt"]["changedEntityIds"]) == {"layer_kael", "char_kael"}
    undone = execute(client, command(1, "undo"))
    assert authored(undone["document"]) == original
    assert conflicts(undone)
    redone = execute(client, command(2, "redo"))
    assert authored(redone["document"]) == authored(repaired["document"])
    cleared = execute(client, command(3, args={"pose": None}))
    assert cleared["document"]["layers"][1]["pose"] is None
    assert authored(execute(client, command(4, "undo"))["document"]) == authored(
        repaired["document"],
    )


def test_recovery_is_atomic_reversible_and_restart_safe(tmp_path: Path) -> None:
    path = tmp_path / "recovery.sqlite3"
    with TestClient(main.create_app(path)) as first:
        original = get(first)["document"]
        recovered = execute(first, command(op="recordConstraintRecovery"))
        document = recovered["document"]
        assert document["events"][-1] == {
            "id": "event_recovery", "sceneId": "scene_rooftop", "order": 2,
            "kind": "physical_recovery",
            "description": "Kael's left arm recovers before the confrontation.",
        }
        assert document["scenes"][1]["eventIds"] == ["event_betrayal", "event_recovery"]
        assert document["characters"][0]["constraints"][0]["resolvedByEventId"] == "event_recovery"
        assert conflicts(recovered) == []
        assert set(recovered["receipt"]["changedEntityIds"]) == {
            "constraint_kael_left_arm", "char_kael", "event_recovery", "scene_rooftop",
        }
    with TestClient(main.create_app(path)) as second:
        assert get(second)["document"] == document
        undone = execute(second, command(1, "undo"))
        assert authored(undone["document"]) == original
        assert conflicts(undone)
        assert set(undone["receipt"]["changedEntityIds"]) == set(
            recovered["receipt"]["changedEntityIds"],
        )
    with TestClient(main.create_app(path)) as third:
        redone = execute(third, command(2, "redo"))
        assert authored(redone["document"]) == authored(document)
        assert conflicts(redone) == []
        assert redone["document"]["project"]["revision"] == 3


@pytest.mark.parametrize("changes", [
    {"targetId": "missing"}, {"targetId": "layer_sign"},
    {"args": {"pose": ""}}, {"args": {"pose": "x" * 129}},
    {"args": {"pose": 3}}, {"args": {}}, {"args": {"pose": None, "extra": 1}},
])
def test_invalid_pose_repairs_do_not_write(client: TestClient, changes: dict[str, Any]) -> None:
    before = get(client)
    response = client.post(BASE + "/commands", json=command(**changes))
    assert response.status_code in (404, 422)
    assert get(client) == before


@pytest.mark.parametrize("changes", [
    {"eventId": "event_injury"}, {"eventId": "char_kael"},
    {"eventId": "constraint_kael_left_arm"}, {"eventId": "branch_main"},
    {"sceneId": "missing"}, {"order": 0}, {"order": 1}, {"order": -1},
    {"order": 1.5}, {"order": True}, {"order": 9007199254740992},
    {"description": ""}, {"description": "x" * 1001},
])
def test_invalid_recoveries_do_not_write(client: TestClient, changes: dict[str, Any]) -> None:
    payload = command(op="recordConstraintRecovery")
    payload["args"].update(changes)
    before = get(client)
    response = client.post(BASE + "/commands", json=payload)
    assert response.status_code in (404, 422)
    assert get(client) == before


def test_already_resolved_stale_and_wrong_targets_do_not_write(client: TestClient) -> None:
    execute(client, command(op="recordConstraintRecovery"))
    before = get(client)
    for payload, status in [
        (command(1, "recordConstraintRecovery"), 409),
        (command(commandId="stale"), 409),
        (command(1, "recordConstraintRecovery", targetId="layer_kael"), 404),
    ]:
        response = client.post(BASE + "/commands", json=payload)
        assert response.status_code == status, response.text
        assert get(client) == before


@pytest.mark.parametrize("op", ["setLayerPose", "recordConstraintRecovery"])
def test_new_repairs_replay_original_result_and_rollback(
    client: TestClient, monkeypatch, op: str,
) -> None:
    from app import commands as command_module
    payload = command(op=op)
    original = execute(client, payload)
    execute(client, command(1, "undo"))
    assert execute(client, payload) == original
    before = get(client)
    monkeypatch.setattr(command_module, "validate_document", lambda value: [{"message": "bad"}])
    assert client.post(BASE + "/commands", json=command(2, op)).status_code == 422
    assert get(client) == before


def test_analysis_is_never_persisted_and_legacy_transform_inverse_survives_restart(
    tmp_path: Path,
) -> None:
    path = tmp_path / "legacy.sqlite3"
    with TestClient(main.create_app(path)) as client:
        original = get(client)["document"]
        execute(client, command(op="setLayerTransform", args={"x": 0.12}))
    engine = create_engine("sqlite:///" + path.as_posix())
    with engine.begin() as connection:
        row = connection.execute(select(commands)).mappings().one()
        # Task 02 stored no operation discriminator. Keep those exact old shapes readable.
        connection.execute(commands.update().values(
            forward={"targetId": "layer_kael", "args": {**original["layers"][1]["transform"],
                                                        "x": 0.12}},
            inverse={"targetId": "layer_kael", "args": original["layers"][1]["transform"]},
        ))
        assert "analysis" not in row["result"]
        assert all("analysis" not in value for value in connection.execute(
            select(snapshots.c.document),
        ).scalars())
    engine.dispose()
    with TestClient(main.create_app(path)) as client:
        assert authored(execute(client, command(1, "undo"))["document"]) == original
        redone = execute(client, command(2, "redo"))
        assert redone["document"]["layers"][1]["transform"]["x"] == 0.12


def test_pose_requires_existing_character_and_recovery_valid_start(
    tmp_path: Path, monkeypatch,
) -> None:
    fixture = load_fixture()
    fixture["layers"][1]["characterId"] = "missing_character"
    fixture["characters"][0]["constraints"][0]["effectiveFromEventId"] = "missing_start"
    monkeypatch.setattr("app.repository.load_fixture", lambda: copy.deepcopy(fixture))
    with TestClient(main.create_app(tmp_path / "invalid_refs.sqlite3")) as client:
        before = get(client)
        assert client.post(BASE + "/commands", json=command()).status_code == 422
        assert client.post(BASE + "/commands", json=command(
            op="recordConstraintRecovery",
        )).status_code == 422
        assert get(client) == before


def test_replay_uses_original_document_and_current_asset_inventory(
    tmp_path: Path,
) -> None:
    asset = tmp_path / "assets" / "fixtures" / "kael.svg"
    asset.parent.mkdir(parents=True)
    asset.write_text("<svg/>", encoding="utf-8")
    with TestClient(main.create_app(tmp_path / "inventory.sqlite3", asset_root=tmp_path)) as client:
        payload = command()
        original = execute(client, payload)
        execute(client, command(1, "undo"))
        asset.unlink()
        replay = execute(client, payload)
        assert {key: value for key, value in replay.items() if key != "analysis"} == {
            key: value for key, value in original.items() if key != "analysis"
        }
        assert replay["analysis"]["revision"] == 1
        assert get(client)["document"]["project"]["revision"] == 2
        assert replay["analysis"] != original["analysis"]
        assert any(issue["code"] == "asset.missing" and issue["subjectId"] == "asset_kael"
                   for issue in replay["analysis"]["issues"])
