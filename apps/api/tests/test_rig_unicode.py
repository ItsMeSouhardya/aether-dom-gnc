"""Public validators share explicit Unicode text and ID boundaries with Ajv."""

import json
from copy import deepcopy
from pathlib import Path

import pytest

from app.commands import CommandError, validate_command
from app.contracts import load_fixture, validate_document
from app.rigs import validate_rig
from tests.test_rig_api import SVG
from tests.test_rigs import RIG
from tests.test_stage_api import BASE, command

CASES = json.loads(
    (Path(__file__).resolve().parents[3] / "packages/schema/fixtures/rig-unicode-cases.json")
    .read_text(encoding="utf-8")
)
TEXT_PATHS = [("name",), ("bones", 0, "name"), ("bones", 0, "limb"),
              ("bones", 0, "action"), ("attachments", 0, "name")]
ID_PATHS = [("id",), ("bones", 0, "id"), ("bones", 1, "parentId"),
            ("bones", 0, "keyframes", 0, "id"), ("attachments", 0, "id"),
            ("attachments", 0, "boneId"), ("attachments", 0, "elementId")]


def changed_rig(path, value):
    rig = deepcopy(RIG)
    rig["bones"][0]["keyframes"] = [{"id": "frame", "timeMs": 0, "rotationDeg": 0}]
    owner = rig
    for key in path[:-1]:
        owner = owner[key]
    old = owner[path[-1]]
    owner[path[-1]] = value
    if path[-1] not in ("name", "limb", "action"):
        for bone in rig["bones"]:
            for key in ("id", "parentId"):
                if bone[key] == old:
                    bone[key] = value
        for slot in rig["attachments"]:
            if slot["boneId"] == old:
                slot["boneId"] = value
    return rig


def import_args(rig):
    return dict(assetId="new_asset", layerId="new_layer", name="Rig",
                rights="project_original", characterId="char_kael", svg=SVG, rig=rig)


def assert_command_valid(payload, valid):
    if valid:
        assert validate_command(payload) == payload
    else:
        with pytest.raises(CommandError) as error:
            validate_command(payload)
        assert error.value.status == 422


@pytest.mark.parametrize("case", CASES, ids=lambda c: c["name"])
def test_unicode_rig_document_import_guards(case):
    for paths, valid in ((TEXT_PATHS, case["validText"]), (ID_PATHS, case["validId"])):
        for path in paths:
            rig = changed_rig(path, case["value"])
            assert (not validate_rig(rig)) == valid, path
            doc = load_fixture()
            doc["schemaVersion"] = "0.5.0"
            doc["layers"][0].update(kind="character_sprite", characterId="char_kael", rig=rig)
            assert (not validate_document(doc)) == valid, path
            payload = command(0, "importRigLayer", "shot_rooftop", **import_args(rig))
            assert_command_valid(payload, valid)


@pytest.mark.parametrize("case", CASES, ids=lambda c: c["name"])
def test_unicode_command_text_id_guards(case):
    pose = command(0, "setRigBonePose", "root", rotationDeg=0, action=case["value"])
    assert_command_valid(pose, case["validText"])
    for op in ("setRigBoneKeyframe", "deleteRigBoneKeyframe"):
        args = {"keyframeId": case["value"]}
        if op == "setRigBoneKeyframe":
            args.update(timeMs=0, rotationDeg=0)
        assert_command_valid(command(0, op, "root", **args), case["validId"])
    for field, valid in (("name", case["validText"]), ("characterId", case["validId"])):
        args = import_args(deepcopy(RIG))
        args[field] = case["value"]
        assert_command_valid(command(0, "importRigLayer", "shot_rooftop", **args), valid)


@pytest.mark.parametrize("action", ["\ufeff", "\u0085"])
def test_raw_api_rejects_unicode_blank_action_without_writes(tmp_path, action):
    from fastapi.testclient import TestClient

    from app.main import create_app

    with TestClient(create_app(tmp_path / "unicode.sqlite3", tmp_path)) as client:
        imported = client.post(BASE + "/commands", json=command(
            0, "importRigLayer", "shot_rooftop", **import_args(deepcopy(RIG))))
        assert imported.status_code == 200, imported.text
        before = client.get(BASE + "/document").json()
        assert before["document"]["project"]["revision"] == 1
        assert len(before["history"]["entries"]) == 1
        response = client.post(BASE + "/commands", json=command(
            1, "setRigBonePose", "root", rotationDeg=5, action=action))
        assert response.status_code == 422, response.text
        assert client.get(BASE + "/document").json() == before
