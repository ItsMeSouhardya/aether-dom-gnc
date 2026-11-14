"""Audio authorship remains canonical, lossless, and revision checked."""
import copy
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.commands import CommandError, apply_operation
from app.contracts import load_fixture, validate_document
from app.main import create_app
from tests.test_stage_api import BASE, authored, command, save


@pytest.mark.parametrize("version,existing", [
    ("0.1.0", None), ("0.2.0", None), ("0.3.0", None), ("0.3.0", 0.25),
])
def test_audio_edit_losslessly_upgrades_and_exactly_undoes(version: str, existing: float | None):
    document = load_fixture()
    document["schemaVersion"] = version
    if existing is not None:
        document["shots"][0]["audio"] = {"tension": existing}
    before = copy.deepcopy(document)
    result, forward, inverse, changed = apply_operation(document, {
        "op": "setShotTension", "targetId": "shot_rooftop", "args": {"tension": 0.8},
    })
    assert result["schemaVersion"] == "0.3.0"
    assert result["shots"][0]["audio"] == {"tension": 0.8}
    assert changed == ["shot_rooftop"]
    assert document == before
    assert validate_document(result) == []
    restored = apply_operation(result, inverse)[0]
    assert restored == before
    assert apply_operation(restored, forward)[0] == result


def test_stage_edits_preserve_v3_audio_and_undo_presence():
    document = load_fixture()
    document["schemaVersion"] = "0.3.0"
    document["shots"][0]["audio"] = {"tension": 0.75}
    result, _, inverse, _ = apply_operation(document, {
        "op": "setLayerAppearance", "targetId": "layer_sign", "args": {"opacity": 0.5},
    })
    assert result["schemaVersion"] == "0.3.0"
    assert result["shots"][0]["audio"] == {"tension": 0.75}
    assert apply_operation(result, inverse)[0] == document


def test_tension_preserves_v5_rig_and_exact_undo():
    document = load_fixture()
    document["schemaVersion"] = "0.5.0"
    document["layers"][1]["rig"] = {
        "id": "rig", "name": "Rig",
        "bones": [{"id": "bone", "name": "Bone", "parentId": None,
                   "rest": {"x": 0, "y": 0, "rotationDeg": 0},
                   "rotationDeg": 0, "limb": None, "action": None}],
        "attachments": [{"id": "slot", "name": "Slot", "boneId": "bone",
                         "elementId": "part"}],
    }
    assert validate_document(document) == []
    before = copy.deepcopy(document)
    result, _, inverse, _ = apply_operation(document, {
        "op": "setShotTension", "targetId": "shot_rooftop", "args": {"tension": 0.8},
    })
    assert result["schemaVersion"] == "0.5.0"
    assert validate_document(result) == []
    assert apply_operation(result, inverse)[0] == before


@pytest.mark.parametrize("audio", [{}, {"tension": -0.1}, {"tension": 1.1},
                                    {"tension": True}, {"tension": float("inf")},
                                    {"tension": 0.5, "gain": 1}])
def test_invalid_authored_audio_is_rejected(audio: dict[str, Any]):
    document = load_fixture()
    document["schemaVersion"] = "0.3.0"
    document["shots"][0]["audio"] = audio
    assert validate_document(document)


def test_tension_restart_replay_stale_atomic_rejections_and_exact_undo(tmp_path: Path):
    path = tmp_path / "audio.sqlite3"
    payload = command(0, "setShotTension", "shot_rooftop", tension=0.7)
    with TestClient(create_app(path, asset_root=tmp_path)) as client:
        result = save(client, payload)
        assert result["receipt"]["changedEntityIds"] == ["shot_rooftop"]
        assert save(client, payload) == result
        before = client.get(BASE + "/document").json()
        for index, invalid in enumerate([
                        command(0, "setShotTension", "shot_rooftop", tension=0.2),
                        command(1, "setShotTension", "missing", tension=0.2),
                        command(1, "setShotTension", "layer_sign", tension=0.2),
                        command(1, "setShotTension", "shot_rooftop", tension=2)]):
            invalid["commandId"] = f"invalid_audio_{index}"
            response = client.post(BASE + "/commands", json=invalid)
            assert response.status_code in {404, 409, 422}
            assert client.get(BASE + "/document").json() == before
    with TestClient(create_app(path, asset_root=tmp_path)) as client:
        assert save(client, payload) == result
        assert authored(save(client, command(1, "undo"))["document"]) == load_fixture()
        restored = save(client, command(2, "redo"))["document"]
        assert authored(restored) == authored(result["document"])
        updated = save(client, command(3, "setShotTension", "shot_rooftop", tension=0.1))
        assert updated["document"]["shots"][0]["audio"]["tension"] == 0.1
        restored = save(client, command(4, "undo"))["document"]
        assert authored(restored) == authored(result["document"])


def test_ambiguous_shot_ids_cannot_be_edited():
    document = load_fixture()
    document["layers"][0]["id"] = "shot_rooftop"
    with pytest.raises(CommandError, match="globally unique"):
        apply_operation(document, {"op": "setShotTension", "targetId": "shot_rooftop",
                                   "args": {"tension": 0.3}})
