from copy import deepcopy

import pytest

from app.commands import CommandError, apply_operation
from app.contracts import load_fixture
from app.svg_assets import SvgAssetStore
from tests.test_rigs import RIG

SVG = (
    '<svg id="svg_root" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
    '<g id="part"><rect x="1" y="1" width="10" height="10"/></g></svg>'
)


def test_import_pose_frames_and_exact_inverse(tmp_path):
    doc = load_fixture()
    op = {
        "op": "importRigLayer",
        "targetId": doc["shots"][0]["id"],
        "args": {
            "assetId": "new_asset",
            "layerId": "new_layer",
            "name": "Rig",
            "rights": "project_original",
            "characterId": doc["characters"][0]["id"],
            "svg": SVG,
            "rig": deepcopy(RIG),
        },
    }
    result, forward, inverse, changed = apply_operation(doc, op, SvgAssetStore(tmp_path))
    assert result["schemaVersion"] == "0.5.0"
    assert {"rig", "root", "child", "slot", "new_asset", "new_layer"} <= set(changed)
    assert apply_operation(result, inverse)[0] == doc
    assert apply_operation(doc, forward)[0] == result
    posed, _, _, changed = apply_operation(
        result,
        {
            "op": "setRigBonePose",
            "targetId": "child",
            "args": {"rotationDeg": 42, "action": "lift"},
        },
    )
    assert changed == ["child"]
    with pytest.raises(CommandError):
        apply_operation(
            posed,
            {
                "op": "setRigBonePose",
                "targetId": "child",
                "args": {"rotationDeg": 42, "action": "lift"},
            },
        )
    keyed, _, undo, changed = apply_operation(
        posed,
        {
            "op": "setRigBoneKeyframe",
            "targetId": "child",
            "args": {"keyframeId": "frame", "timeMs": 10, "rotationDeg": 60},
        },
    )
    assert changed == ["child", "frame"]
    assert apply_operation(keyed, undo)[0] == posed
    deleted, _, _, _ = apply_operation(
        keyed, {"op": "deleteRigBoneKeyframe", "targetId": "child", "args": {"keyframeId": "frame"}}
    )
    assert deleted == posed


def test_import_rejects_missing_group_before_media_write(tmp_path):
    doc = load_fixture()
    rig = deepcopy(RIG)
    rig["attachments"][0]["elementId"] = "missing"
    op = {
        "op": "importRigLayer",
        "targetId": doc["shots"][0]["id"],
        "args": {
            "assetId": "new_asset",
            "layerId": "new_layer",
            "name": "Rig",
            "rights": "project_original",
            "characterId": doc["characters"][0]["id"],
            "svg": SVG,
            "rig": rig,
        },
    }
    with pytest.raises(CommandError):
        apply_operation(doc, op, SvgAssetStore(tmp_path))
    assert not list(tmp_path.iterdir())


def test_articulated_template_is_valid_and_inert(tmp_path):
    from fastapi.testclient import TestClient

    from app.main import create_app
    from app.rigs import validate_rig, validate_rig_bindings
    from app.svg_assets import parse_svg

    with TestClient(create_app(tmp_path / "db.sqlite", tmp_path)) as client:
        response = client.get("/api/v1/fixtures/articulated-rig")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    payload = response.json()
    assert payload["templateVersion"] == "1.0.0"
    assert not validate_rig(payload["rig"])
    assert not validate_rig_bindings(payload["rig"], parse_svg(payload["svg"]))


def test_portable_rejects_rig_source_mismatch():
    import json

    from app.contracts import SCHEMA_ROOT
    from app.player_manifest import validate_player_manifest

    value = json.loads((SCHEMA_ROOT / "fixtures/player-manifest.json").read_text(encoding="utf-8"))
    layer = value["document"]["layers"][0]
    value["document"]["schemaVersion"] = "0.5.0"
    layer["kind"] = "character_sprite"
    layer["characterId"] = value["document"]["characters"][0]["id"]
    layer["rig"] = {
        "id": "test_rig",
        "name": "Rig",
        "bones": [
            {
                "id": "test_bone",
                "name": "Bone",
                "parentId": None,
                "rest": {"x": 0, "y": 0, "rotationDeg": 0},
                "rotationDeg": 0,
                "limb": None,
                "action": None,
            }
        ],
        "attachments": [
            {"id": "test_slot", "name": "Slot", "boneId": "test_bone", "elementId": "part"}
        ],
    }
    svg = next(entry["svg"] for entry in value["assets"] if entry["assetId"] == layer["assetId"])
    svg["root"]["children"] = [
        {
            "tag": "g",
            "id": "part",
            "attributes": {},
            "text": "",
            "children": svg["root"]["children"],
        }
    ]
    assert not validate_player_manifest(value)
    layer["rig"]["attachments"][0]["elementId"] = "missing"
    assert validate_player_manifest(value)


def test_real_revision_replay_undo_redo_and_restart(tmp_path):
    from fastapi.testclient import TestClient

    from app.main import create_app
    from tests.test_stage_api import BASE, authored, command

    path = tmp_path / "rig.sqlite3"
    payload = command(
        0,
        "importRigLayer",
        "shot_rooftop",
        assetId="new_asset",
        layerId="new_layer",
        name="Rig",
        rights="project_original",
        characterId="char_kael",
        svg=SVG,
        rig=deepcopy(RIG),
    )
    with TestClient(create_app(path, tmp_path)) as client:
        response = client.post(BASE + "/commands", json=payload)
        assert response.status_code == 200, response.text
        saved = response.json()
        assert client.post(BASE + "/commands", json=payload).json() == saved
        pose = command(1, "setRigBonePose", "child", rotationDeg=5, action=None)
        assert client.post(BASE + "/commands", json=pose).status_code == 200
        assert client.post(BASE + "/commands", json=command(1, "undo")).status_code == 409
        undo_pose = client.post(BASE + "/commands", json=command(2, "undo"))
        assert undo_pose.status_code == 200
        undo_import = client.post(BASE + "/commands", json=command(3, "undo"))
        assert undo_import.status_code == 200
        assert authored(undo_import.json()["document"]) == load_fixture()
    with TestClient(create_app(path, tmp_path)) as client:
        redo = client.post(BASE + "/commands", json=command(4, "redo"))
        assert redo.status_code == 200, redo.text
        assert authored(redo.json()["document"]) == authored(saved["document"])


def test_svg_edit_cannot_invalidate_rig_source(tmp_path):
    doc = load_fixture()
    op = {
        "op": "importRigLayer",
        "targetId": doc["shots"][0]["id"],
        "args": {
            "assetId": "new_asset",
            "layerId": "new_layer",
            "name": "Rig",
            "rights": "project_original",
            "characterId": doc["characters"][0]["id"],
            "svg": SVG,
            "rig": deepcopy(RIG),
        },
    }
    store = SvgAssetStore(tmp_path)
    saved = apply_operation(doc, op, store)[0]
    with pytest.raises(CommandError):
        apply_operation(
            saved,
            {
                "op": "editSvgElement",
                "targetId": "new_asset",
                "args": {"elementId": "svg_root", "attributes": {"transform": "translate(1 2)"}},
            },
            store,
        )


@pytest.mark.parametrize("mutation", ["collision", "character", "group", "root_transform"])
def test_import_rejects_invalid_references_before_storage(tmp_path, mutation):
    doc = load_fixture()
    rig = deepcopy(RIG)
    args = {
        "assetId": "new_asset",
        "layerId": "new_layer",
        "name": "Rig",
        "rights": "project_original",
        "characterId": doc["characters"][0]["id"],
        "svg": SVG,
        "rig": rig,
    }
    if mutation == "collision":
        rig["bones"][0]["id"] = doc["layers"][0]["id"]
        rig["bones"][1]["parentId"] = rig["bones"][0]["id"]
    elif mutation == "character":
        args["characterId"] = "missing"
    elif mutation == "group":
        rig["attachments"][0]["elementId"] = "missing"
    else:
        args["svg"] = SVG.replace("<svg ", '<svg transform="translate(1 2)" ')
    with pytest.raises(CommandError):
        apply_operation(
            doc,
            {"op": "importRigLayer", "targetId": doc["shots"][0]["id"], "args": args},
            SvgAssetStore(tmp_path),
        )
    assert not list(tmp_path.iterdir())


def test_frame_timing_and_total_budget_are_checked(tmp_path):
    doc = load_fixture()
    rig = deepcopy(RIG)
    rig["bones"][1]["keyframes"] = [
        {"id": f"frame_{i}", "timeMs": i, "rotationDeg": 0} for i in range(128)
    ]
    op = {
        "op": "importRigLayer",
        "targetId": doc["shots"][0]["id"],
        "args": {
            "assetId": "new_asset",
            "layerId": "new_layer",
            "name": "Rig",
            "rights": "project_original",
            "characterId": doc["characters"][0]["id"],
            "svg": SVG,
            "rig": rig,
        },
    }
    saved = apply_operation(doc, op, SvgAssetStore(tmp_path))[0]
    for time in (129, doc["shots"][0]["durationMs"] + 1):
        with pytest.raises(CommandError):
            apply_operation(
                saved,
                {
                    "op": "setRigBoneKeyframe",
                    "targetId": "root",
                    "args": {"keyframeId": "new_frame", "timeMs": time, "rotationDeg": 0},
                },
            )


def test_http_frames_and_fork_preserve_rig(tmp_path):
    from fastapi.testclient import TestClient

    from app.main import create_app
    from tests.test_branches import fork
    from tests.test_stage_api import BASE, command

    with TestClient(create_app(tmp_path / "rig.sqlite3", tmp_path)) as client:
        imported = command(
            0,
            "importRigLayer",
            "shot_rooftop",
            assetId="new_asset",
            layerId="new_layer",
            name="Rig",
            rights="project_original",
            characterId="char_kael",
            svg=SVG,
            rig=deepcopy(RIG),
        )
        assert client.post(BASE + "/commands", json=imported).status_code == 200
        add = command(
            1, "setRigBoneKeyframe", "child", keyframeId="frame", timeMs=100, rotationDeg=20
        )
        assert client.post(BASE + "/commands", json=add).status_code == 200
        update = command(
            2, "setRigBoneKeyframe", "child", keyframeId="frame", timeMs=100, rotationDeg=30
        )
        assert client.post(BASE + "/commands", json=update).status_code == 200
        forked = client.post("/api/v1/projects/proj_neon_shogun/branches", json=fork(revision=3))
        assert forked.status_code == 200, forked.text
        child = client.get("/api/v1/projects/proj_neon_shogun/branches/branch_alt/document").json()[
            "document"
        ]
        assert child["layers"][-1]["rig"]["bones"][1]["keyframes"][0]["rotationDeg"] == 30
        delete = command(3, "deleteRigBoneKeyframe", "child", keyframeId="frame")
        assert client.post(BASE + "/commands", json=delete).status_code == 200
        restored = client.post(BASE + "/commands", json=command(4, "undo")).json()["document"]
        assert restored["layers"][-1]["rig"]["bones"][1]["keyframes"][0]["rotationDeg"] == 30
