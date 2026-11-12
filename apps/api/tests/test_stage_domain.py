"""Pure domain tests run independently of the HTTP runtime."""
import copy

import pytest

from app.commands import CommandError, apply_operation
from app.contracts import load_fixture, validate_document
from app.dependency_graph import build_graph


def operation(op, args, target="layer_kael"):
    return {"op": op, "targetId": target, "args": args}


def test_first_stage_edit_and_exact_snapshot_undo():
    original = load_fixture()
    result, forward, inverse, changed = apply_operation(
        original, operation("setLayerAppearance", {"visible": False}),
    )
    assert result["schemaVersion"] == "0.2.0"
    assert original == load_fixture()
    assert result["layers"][1]["visible"] is False
    restored, _, _, _ = apply_operation(result, inverse)
    assert restored == original
    assert apply_operation(restored, forward)[0] == result
    assert changed == ["layer_kael"]


def test_keyframes_identity_duration_upsert_and_graph():
    document = load_fixture()
    transform = copy.deepcopy(document["layers"][1]["transform"])
    op = operation("setLayerKeyframe", {
        "keyframeId": "kf_灯", "timeMs": 1000, "transform": transform,
    })
    result, _, _, changed = apply_operation(document, op)
    assert changed == ["kf_灯", "layer_kael"]
    graph = build_graph(result)
    assert "kf_灯" in graph.nodes
    assert ("kf_灯", "layer_kael", "animates") in graph.edges
    assert validate_document(result) == []
    assert len(apply_operation(result, op)[0]["layers"][1]["keyframes"]) == 1
    for key, value in [("keyframeId", "layer_vance"), ("timeMs", -1), ("timeMs", 999999)]:
        with pytest.raises(CommandError):
            apply_operation(result, operation("setLayerKeyframe", {**op["args"], key: value}))
    removed, _, inverse, changed = apply_operation(
        result, operation("deleteLayerKeyframe", {"keyframeId": "kf_灯"}),
    )
    assert changed == ["kf_灯", "layer_kael"]
    assert apply_operation(removed, inverse)[0] == result


def test_v2_structure_and_camera_validation():
    document = load_fixture()
    document["schemaVersion"] = "0.2.0"
    assert validate_document(document) == []
    camera = {"aspectRatio": "9:16", "position": {"x": 2, "y": -3, "z": 5}, "fovDeg": 60}
    result, _, inverse, _ = apply_operation(document, operation(
        "setShotCamera", {"camera": camera}, document["shots"][0]["id"],
    ))
    assert result["shots"][0]["camera"]["position"]["y"] == -3
    assert apply_operation(result, inverse)[0] == document


def test_keyframe_bounds_unique_times_and_global_ids():
    document = load_fixture()
    document["schemaVersion"] = "0.2.0"
    layer = document["layers"][1]
    transform = layer["transform"]
    layer["keyframes"] = [{"id": f"kf_{index}", "timeMs": index, "transform": transform}
                          for index in range(128)]
    before = copy.deepcopy(document)
    for frame_id, time_ms in [("new", 129), ("new", 127), ("layer_vance", 129)]:
        with pytest.raises(CommandError):
            apply_operation(document, operation("setLayerKeyframe", {
                "keyframeId": frame_id, "timeMs": time_ms, "transform": transform,
            }))
        assert document == before
    updated = apply_operation(document, operation("setLayerKeyframe", {
        "keyframeId": "kf_127", "timeMs": 128, "transform": {**transform, "x": 42},
    }))[0]
    assert len(updated["layers"][1]["keyframes"]) == 128
    assert updated["layers"][1]["keyframes"][-1]["transform"]["x"] == 42


def test_duplicate_global_keyframe_id_blocks_upsert():
    document = load_fixture()
    document["schemaVersion"] = "0.2.0"
    frame = {"id": "duplicate", "timeMs": 0, "transform": document["layers"][0]["transform"]}
    document["layers"][0]["keyframes"] = [copy.deepcopy(frame)]
    document["layers"][1]["keyframes"] = [copy.deepcopy(frame)]
    with pytest.raises(CommandError, match="globally unique"):
        apply_operation(document, operation("setLayerKeyframe", {
            "keyframeId": "duplicate", "timeMs": 0, "transform": frame["transform"],
        }))
