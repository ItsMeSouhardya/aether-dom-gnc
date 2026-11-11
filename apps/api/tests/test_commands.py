"""Behavioral contract for the durable, revision-checked command boundary."""

import copy
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app import main
from app.contracts import load_fixture, validate_document

BASE = "/api/v1/projects/proj_neon_shogun/branches/branch_main"


def command(revision: int = 0, op: str = "setLayerTransform", **overrides: Any) -> dict[str, Any]:
    result = {
        "commandId": f"cmd_{revision}_{op}", "projectId": "proj_neon_shogun",
        "branchId": "branch_main", "expectedRevision": revision,
        "actor": {"kind": "human", "id": "creator_1"}, "op": op, "reason": "Frame Kael",
    }
    if op == "setLayerTransform":
        result.update(targetId="layer_kael", args={"x": -0.25})
    return result | overrides


def app_for(path: Path):
    assert hasattr(main, "create_app"), "The API needs an isolated persistent app factory"
    return main.create_app(path)


@pytest.fixture
def client(tmp_path: Path):
    with TestClient(app_for(tmp_path / "test.sqlite3")) as client:
        yield client


def snapshot(client: TestClient) -> dict[str, Any]:
    response = client.get(BASE + "/document")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    return response.json()


def execute(client: TestClient, payload: dict[str, Any]) -> dict[str, Any]:
    response = client.post(BASE + "/commands", json=payload)
    assert response.status_code == 200, response.text
    assert response.headers["cache-control"] == "no-store"
    return response.json()


def authored(document: dict[str, Any]) -> dict[str, Any]:
    result = copy.deepcopy(document)
    result["project"]["revision"] = 0
    result["branches"][0]["headRevision"] = 0
    return result


def test_app_factory_provides_isolated_seeded_database(tmp_path: Path) -> None:
    with TestClient(app_for(tmp_path / "isolated.sqlite3")) as client:
        assert snapshot(client)["document"] == load_fixture()


def test_partial_transform_preserves_other_fields_and_fixture(client: TestClient) -> None:
    before = snapshot(client)
    assert before == {"document": load_fixture(), "history": {
        "canUndo": False, "canRedo": False, "entries": [],
    }}
    result = execute(client, command())
    expected = load_fixture()
    expected["layers"][1]["transform"]["x"] = -0.25
    expected["project"]["revision"] = 1
    expected["branches"][0]["headRevision"] = 1
    assert result["document"] == expected
    assert validate_document(result["document"]) == []
    assert result["history"] == {"canUndo": True, "canRedo": False,
                                 "entries": [result["receipt"]]}
    assert result["receipt"] == {
        "commandId": "cmd_0_setLayerTransform", "revision": 1, "op": "setLayerTransform",
        "targetId": "layer_kael", "reason": "Frame Kael",
        "createdAt": result["receipt"]["createdAt"], "changedEntityIds": ["layer_kael"],
    }
    assert snapshot(client)["document"] == expected
    assert client.get("/api/v1/fixtures/neon-shogun").json() == load_fixture()


@pytest.mark.parametrize("overrides", [
    {"args": {}}, {"args": {"x": "2"}}, {"args": {"scale": 0}}, {"args": {"scale": -1}},
    {"args": {"unknown": 1}}, {"actor": {"kind": "agent", "id": "ai"}},
    {"expectedRevision": True}, {"expectedRevision": -1}, {"reason": ""}, {"extra": 1},
    {"op": "undo", "args": {"x": 1}}, {"projectId": "different"}, {"branchId": "different"},
])
def test_invalid_commands_do_not_write(client: TestClient, overrides: dict[str, Any]) -> None:
    before = snapshot(client)
    response = client.post(BASE + "/commands", json=command(**overrides))
    assert response.status_code == 422
    assert isinstance(response.json()["detail"]["code"], str)
    assert snapshot(client) == before


@pytest.mark.parametrize("number", [
    "NaN", "Infinity", "-Infinity", "1e400", "1" + "0" * 400, "-1" + "0" * 400,
])
def test_non_finite_commands_are_rejected(client: TestClient, number: str) -> None:
    payload = json.dumps(command()).replace('"x": -0.25', '"x": ' + number)
    response = client.post(BASE + "/commands", content=payload,
                           headers={"Content-Type": "application/json"})
    assert response.status_code == 422
    assert snapshot(client)["document"]["project"]["revision"] == 0


@pytest.mark.parametrize("payload", ["{", "null", "[]", "42"])
def test_malformed_body_returns_structured_error(client: TestClient, payload: str) -> None:
    response = client.post(BASE + "/commands", content=payload,
                           headers={"Content-Type": "application/json"})
    assert response.status_code == 422
    assert isinstance(response.json()["detail"]["code"], str)


@pytest.mark.parametrize("path", [
    "/api/v1/projects/missing/branches/branch_main",
    "/api/v1/projects/proj_neon_shogun/branches/missing",
])
def test_unknown_project_and_branch(client: TestClient, path: str) -> None:
    assert client.get(path + "/document").status_code == 404
    payload = command(projectId=path.split("/")[4], branchId=path.split("/")[6])
    assert client.post(path + "/commands", json=payload).status_code == 404


def test_unknown_target_does_not_write(client: TestClient) -> None:
    assert client.post(BASE + "/commands", json=command(targetId="missing")).status_code == 404
    assert snapshot(client)["history"]["entries"] == []


def test_stale_revision_has_no_writes(client: TestClient) -> None:
    execute(client, command())
    before = snapshot(client)
    response = client.post(BASE + "/commands", json=command(commandId="stale"))
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "REVISION_CONFLICT"
    assert response.json()["detail"]["currentRevision"] == 1
    assert snapshot(client) == before


def test_restart_preserves_history_and_redo(tmp_path: Path) -> None:
    path = tmp_path / "persistent.sqlite3"
    with TestClient(app_for(path)) as first:
        changed = execute(first, command())
        undone = execute(first, command(1, "undo"))
    with TestClient(app_for(path)) as second:
        assert snapshot(second) == {k: v for k, v in undone.items() if k != "receipt"}
        redone = execute(second, command(2, "redo"))
        assert authored(redone["document"]) == authored(changed["document"])
        assert redone["document"]["project"]["revision"] == 3


def test_multistep_undo_redo_restores_exact_authored_state(client: TestClient) -> None:
    original = snapshot(client)["document"]
    first = execute(client, command(args={"x": 0.125, "scale": 1.75, "rotationDeg": 88.5}))
    second = execute(client, command(1, targetId="layer_sign", args={"y": -0.125, "z": 9}))
    undo_second = execute(client, command(2, "undo"))
    assert authored(undo_second["document"]) == authored(first["document"])
    assert undo_second["receipt"]["targetId"] == "layer_sign"
    undo_first = execute(client, command(3, "undo"))
    assert authored(undo_first["document"]) == original
    assert undo_first["receipt"]["targetId"] == "layer_kael"
    redo_first = execute(client, command(4, "redo"))
    assert authored(redo_first["document"]) == authored(first["document"])
    redo_second = execute(client, command(5, "redo"))
    assert authored(redo_second["document"]) == authored(second["document"])
    assert redo_second["document"]["project"]["revision"] == 6
    assert redo_second["document"]["branches"][0]["headRevision"] == 6


@pytest.mark.parametrize("op", ["undo", "redo"])
def test_empty_history_fails_without_revision(client: TestClient, op: str) -> None:
    response = client.post(BASE + "/commands", json=command(0, op))
    assert response.status_code == 409
    assert snapshot(client)["document"]["project"]["revision"] == 0


def test_new_edit_cuts_redo_without_erasing_audit(client: TestClient) -> None:
    execute(client, command())
    execute(client, command(1, "undo"))
    execute(client, command(2, args={"y": 0.5}))
    before = snapshot(client)
    assert before["history"]["canRedo"] is False
    assert len(before["history"]["entries"]) == 3
    assert client.post(BASE + "/commands", json=command(3, "redo")).status_code == 409
    assert snapshot(client) == before


def test_command_id_replay_returns_original_committed_result(client: TestClient) -> None:
    payload = command()
    original = execute(client, payload)
    execute(client, command(1, args={"x": 0.5}))
    assert execute(client, payload) == original
    response = client.post(BASE + "/commands", json=payload | {"reason": "Different"})
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "COMMAND_ID_REUSED"
    assert snapshot(client)["document"]["project"]["revision"] == 2


def test_two_repositories_concurrent_writers_have_one_winner(tmp_path: Path) -> None:
    path = tmp_path / "concurrent.sqlite3"
    with TestClient(app_for(path)) as first, TestClient(app_for(path)) as second:
        with ThreadPoolExecutor(max_workers=2) as executor:
            requests = [executor.submit(client.post, BASE + "/commands",
                                       json=command(commandId=f"writer_{index}"))
                        for index, client in enumerate((first, second))]
            responses = [request.result() for request in requests]
        assert sorted(response.status_code for response in responses) == [200, 409]
        assert snapshot(first)["document"]["project"]["revision"] == 1
        assert len(snapshot(second)["history"]["entries"]) == 1


def test_history_limits_receipts_but_retains_every_snapshot(tmp_path: Path) -> None:
    path = tmp_path / "history.sqlite3"
    with TestClient(app_for(path)) as client:
        for revision in range(23):
            execute(client, command(revision, args={"x": revision / 10}))
        history = snapshot(client)["history"]
        assert [entry["revision"] for entry in history["entries"]] == list(range(23, 3, -1))
    engine = create_engine("sqlite:///" + path.as_posix())
    with engine.connect() as connection:
        assert connection.execute(text("SELECT count(*) FROM snapshots")).scalar_one() == 24
        assert connection.execute(text("SELECT count(*) FROM commands")).scalar_one() == 23
    engine.dispose()


def test_result_validation_failure_rolls_back(client: TestClient, monkeypatch) -> None:
    from app import commands
    before = snapshot(client)
    monkeypatch.setattr(commands, "validate_document", lambda document: [{"message": "Invalid"}])
    assert client.post(BASE + "/commands", json=command()).status_code == 422
    assert snapshot(client) == before
    monkeypatch.undo()
    assert execute(client, command())["document"]["project"]["revision"] == 1
