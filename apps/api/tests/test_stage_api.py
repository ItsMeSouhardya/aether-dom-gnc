"""Revision-bound stage commands and immutable SVG references use isolated storage."""
import copy
import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, select

from app.commands import CommandError
from app.contracts import load_fixture
from app.main import create_app
from app.persistence.tables import commands, snapshots
from app.repository import Repository

BASE = "/api/v1/projects/proj_neon_shogun/branches/branch_main"
SVG = '<svg viewBox="0 0 400 200"><rect id="panel" width="400" height="200" fill="#abc"/></svg>'


def command(revision: int, op: str, target: str = "layer_kael", **args: Any) -> dict[str, Any]:
    result = {"commandId": f"stage_{revision}_{op}", "projectId": "proj_neon_shogun",
              "branchId": "branch_main", "expectedRevision": revision,
              "actor": {"kind": "human", "id": "creator"}, "reason": "Stage edit", "op": op}
    if op not in {"undo", "redo"}:
        result.update(targetId=target, args=args)
    return result


def imported(revision: int = 0) -> dict[str, Any]:
    return command(revision, "importSvgLayer", "shot_rooftop", assetId="asset_lamp",
                   layerId="layer_lamp", name="灯 🐈", rights="project_original", svg=SVG)


def authored(document: dict[str, Any]) -> dict[str, Any]:
    result = copy.deepcopy(document)
    result["project"]["revision"] = 0
    result["branches"][0]["headRevision"] = 0
    return result


@pytest.fixture
def client(tmp_path: Path):
    with TestClient(create_app(tmp_path / "stage.sqlite3", asset_root=tmp_path)) as client:
        yield client


def save(client: TestClient, payload: dict[str, Any]) -> dict[str, Any]:
    response = client.post(BASE + "/commands", json=payload)
    assert response.status_code == 200, response.text
    return response.json()


def test_import_stable_ids_replay_restart_and_exact_first_upgrade_undo(tmp_path: Path):
    path = tmp_path / "stage.sqlite3"
    with TestClient(create_app(path, asset_root=tmp_path)) as client:
        payload = imported()
        result = save(client, payload)
        document = result["document"]
        assert document["schemaVersion"] == "0.2.0"
        assert document["assets"][-1]["id"] == "asset_lamp"
        assert document["layers"][-1]["id"] == "layer_lamp"
        assert document["layers"][-1]["transform"]["scale"] == 0.5
        assert document["shots"][0]["layerIds"][-1] == "layer_lamp"
        source_uri = document["assets"][-1]["sourceUri"]
        assert (tmp_path / source_uri).read_text() == SVG
        asset = client.get(BASE + "/assets/asset_lamp?revision=1")
        assert asset.status_code == 200
        assert asset.headers["cache-control"] == "no-store"
        assert asset.json()["root"]["children"][0]["id"] == "panel"
        assert authored(save(client, command(1, "undo"))["document"]) == load_fixture()
        assert client.get(BASE + "/assets/asset_lamp").status_code == 404
        assert client.get(BASE + "/assets/asset_lamp?revision=1").json() == asset.json()
        assert save(client, payload) == result
        assert client.get(BASE + "/document").json()["document"]["project"]["revision"] == 2
    with TestClient(create_app(path, asset_root=tmp_path)) as client:
        assert save(client, payload) == result
        assert authored(save(client, command(2, "redo"))["document"]) == authored(document)
        assert (tmp_path / source_uri).read_text() == SVG


def test_edit_svg_keeps_original_and_id_with_versioned_reads(client: TestClient, tmp_path: Path):
    original = save(client, imported())
    source = original["document"]["assets"][-1]["sourceUri"]
    before = client.get(BASE + "/assets/asset_lamp?revision=1").json()
    result = save(client, command(1, "editSvgElement", "asset_lamp", elementId="panel",
                                  attributes={"fill": "#ff0000", "width": "100"}))
    after = client.get(BASE + "/assets/asset_lamp").json()
    assert after["root"]["children"][0]["id"] == "panel"
    assert after["root"]["children"][0]["attributes"]["width"] == "100"
    assert after["uri"] != before["uri"]
    assert result["document"]["assets"][-1]["id"] == "asset_lamp"
    assert after["sourceUri"] == source
    assert (tmp_path / source).read_text() == SVG
    assert client.get(BASE + "/assets/asset_lamp?revision=1").json() == before
    save(client, command(2, "undo"))
    assert client.get(BASE + "/assets/asset_lamp").json() == before
    assert client.get(BASE + "/assets/asset_lamp?revision=999").status_code == 404


@pytest.mark.parametrize("op,args", [
    ("setLayerAppearance", {}), ("setLayerAppearance", {"opacity": 2}),
    ("setLayerAppearance", {"visible": 1}),
    ("setLayerKeyframe", {"keyframeId": "kf", "timeMs": 0.5, "transform": {}}),
    ("restoreStageSnapshot", {"document": {}}),
    ("setShotCamera", {"camera": {"aspectRatio": "16:9", "position": {
        "x": 0, "y": 0, "z": 0}, "fovDeg": 45}}),
])
def test_invalid_stage_commands_never_upgrade(client: TestClient, op: str, args: dict):
    assert client.post(BASE + "/commands", json=command(0, op, **args)).status_code == 422
    assert client.get(BASE + "/document").json()["document"] == load_fixture()


def test_import_invalid_reused_ids_stale_and_unsafe_edits_are_atomic(client: TestClient):
    before = client.get(BASE + "/document").json()
    payload = imported()
    for args in [{"assetId": "layer_kael"}, {"layerId": "asset_lamp"},
                 {"svg": '<svg><script>alert(1)</script></svg>'}, {"name": "\ud800"}]:
        invalid = {**payload, "args": {**payload["args"], **args}}
        # HTTPX correctly refuses surrogate UTF-8; use ASCII escaped JSON at the boundary.
        response = client.post(BASE + "/commands", content=json.dumps(invalid),
                               headers={"Content-Type": "application/json"})
        assert response.status_code == 422
        assert client.get(BASE + "/document").json() == before
    save(client, payload)
    assert client.post(BASE + "/commands", json={
        **imported(), "commandId": "stale",
    }).status_code == 409
    before = client.get(BASE + "/document").json()
    for attributes in [{"id": "renamed"}, {"onload": "alert(1)"}, {"fill": "url(http://x)"}]:
        assert client.post(BASE + "/commands", json=command(
            1, "editSvgElement", "asset_lamp", elementId="panel", attributes=attributes,
        )).status_code == 422
        assert client.get(BASE + "/document").json() == before


def test_import_rollback_does_not_expose_or_commit_blobs(tmp_path: Path):
    repository = Repository(tmp_path / "rollback.sqlite3", asset_root=tmp_path)
    repository.initialize()

    def fail(connection, cursor, statement, parameters, context, executemany):
        if statement.startswith("INSERT INTO commands"):
            raise RuntimeError("audit failure")

    event.listen(repository.engine, "before_cursor_execute", fail)
    try:
        with pytest.raises(RuntimeError, match="audit failure"):
            repository.execute("proj_neon_shogun", "branch_main", imported())
        assert repository.get("proj_neon_shogun", "branch_main")["document"] == load_fixture()
        with repository.engine.connect() as connection:
            assert len(list(connection.execute(select(snapshots)))) == 1
            assert list(connection.execute(select(commands))) == []
        with pytest.raises(CommandError) as error:
            repository.get_svg_asset("proj_neon_shogun", "branch_main", "asset_lamp")
        assert error.value.status == 404
    finally:
        repository.close()


def test_camera_appearance_keyframes_save_reload_and_removed_graph_impact(client: TestClient):
    camera = {"aspectRatio": "9:16", "position": {"x": 2, "y": -3, "z": 6}, "fovDeg": 55}
    save(client, command(0, "setShotCamera", "shot_rooftop", camera=camera))
    save(client, command(1, "setLayerAppearance", visible=False, opacity=0.25))
    transform = {"x": 1, "y": 2, "z": 3, "scale": 1.5, "rotationDeg": 40}
    payload = command(2, "setLayerKeyframe", keyframeId="kf_灯", timeMs=1000, transform=transform)
    result = save(client, payload)
    assert result["receipt"]["changedEntityIds"] == ["kf_灯", "layer_kael"]
    assert any(node["id"] == "kf_灯" for node in result["analysis"]["graph"]["nodes"])
    assert client.get(BASE + "/document").json()["document"] == result["document"]
    assert result["document"]["shots"][0]["camera"] == camera
    kael = result["document"]["layers"][1]
    assert kael["visible"] is False and kael["opacity"] == 0.25
    assert kael["keyframes"][0]["transform"] == transform
    removed = save(client, command(3, "deleteLayerKeyframe", keyframeId="kf_灯"))
    assert "kf_灯" in removed["analysis"]["invalidation"]["changedEntityIds"]
    assert all(node["id"] != "kf_灯" for node in removed["analysis"]["graph"]["nodes"])
    assert authored(save(client, command(4, "undo"))["document"]) == authored(result["document"])


@pytest.mark.parametrize("position,fov", [
    ({"x": 1001, "y": 0, "z": 5}, 45), ({"x": 0, "y": -1001, "z": 5}, 45),
    ({"x": 0, "y": 0, "z": 1001}, 45), ({"x": 0, "y": 0, "z": 0.09}, 45),
    ({"x": 0, "y": 0, "z": 5}, 0.99), ({"x": 0, "y": 0, "z": 5}, 120.01),
])
def test_camera_bounds_are_rejected_without_upgrade(client: TestClient, position: dict, fov: float):
    payload = command(0, "setShotCamera", "shot_rooftop", camera={
        "aspectRatio": "16:9", "position": position, "fovDeg": fov,
    })
    assert client.post(BASE + "/commands", json=payload).status_code == 422
    assert client.get(BASE + "/document").json()["document"] == load_fixture()
