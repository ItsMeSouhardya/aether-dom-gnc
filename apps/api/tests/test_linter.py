"""Continuity diagnoses cite authored evidence and respect explicit chronology."""

from copy import deepcopy
from typing import Any

import pytest

from app.contracts import load_fixture
from app.linter import analyze_document


def issues(document: dict[str, Any], code: str) -> list[dict[str, Any]]:
    return [issue for issue in analyze_document(document)["issues"] if issue["code"] == code]


def test_seed_conflict_cites_layer_constraint_and_injury_without_mutation() -> None:
    document = load_fixture()
    before = deepcopy(document)
    result = analyze_document(document, ["char_kael"], {"asset_kael": "missing"})
    conflict = next(
        issue for issue in result["issues"] if issue["code"] == "CANON_PHYSICAL_CONFLICT"
    )
    assert result["revision"] == 0
    assert conflict["subjectId"] == "layer_kael"
    assert conflict["path"].endswith("/pose")
    assert {item["entityId"] for item in conflict["evidence"]} >= {
        "layer_kael",
        "constraint_kael_left_arm",
        "event_injury",
    }
    assert any(issue["code"] == "asset.missing" for issue in result["issues"])
    assert not issues(document, "binding.invalid_path")  # derived spatial.x is supported
    assert document == before


@pytest.mark.parametrize("pose", ["lifting_with_right_arm", "standing", None])
def test_supported_pose_repair_resolves_conflict(pose: str | None) -> None:
    document = load_fixture()
    document["layers"][1]["pose"] = pose
    assert not issues(document, "CANON_PHYSICAL_CONFLICT")


def test_unknown_pose_reports_limited_semantic_coverage() -> None:
    document = load_fixture()
    document["layers"][1]["pose"] = "push_up"
    assert issues(document, "physical.unsupported_pose")


def add_recovery(document: dict[str, Any], order: int, scene: str = "scene_rooftop") -> None:
    document["events"].append(
        {
            "id": "healed",
            "sceneId": scene,
            "order": order,
            "kind": "physical_recovery",
            "description": "Arm healed",
        }
    )
    next(item for item in document["scenes"] if item["id"] == scene)["eventIds"].append("healed")
    document["characters"][0]["constraints"][0]["resolvedByEventId"] = "healed"


def test_recovery_is_after_scene_events_and_does_not_clear_earlier_scene() -> None:
    document = load_fixture()
    document["scenes"].append({"id": "later", "title": "Later", "eventIds": [], "shotIds": []})
    add_recovery(document, 2, "later")
    assert issues(document, "CANON_PHYSICAL_CONFLICT")
    document["events"][-1]["sceneId"] = "scene_rooftop"
    document["scenes"][-1]["eventIds"] = []
    document["scenes"][1]["eventIds"].append("healed")
    assert not issues(document, "CANON_PHYSICAL_CONFLICT")


@pytest.mark.parametrize("order", [-1, 0, 1])
def test_bad_or_ambiguous_recovery_order_never_silently_passes(order: int) -> None:
    document = load_fixture()
    add_recovery(document, order)
    assert issues(document, "timeline.ambiguous")
    assert not issues(document, "CANON_PHYSICAL_CONFLICT")  # no guessed physical conclusion


def test_unknown_scene_order_explicitly_reports_coverage_gap() -> None:
    document = load_fixture()
    document["scenes"][1]["eventIds"] = []
    assert issues(document, "timeline.ambiguous")


def test_reference_duplicates_membership_and_binding_failures_are_diagnostics() -> None:
    document = load_fixture()
    document["assets"].append(deepcopy(document["assets"][0]))
    document["layers"][1]["assetId"] = "absent"
    document["shots"][0]["layerIds"].remove("layer_kael")
    document["bindings"][0]["source"]["path"] = "traits.absent"
    document["bindings"][0]["mapping"]["inputMax"] = 0
    codes = {issue["code"] for issue in analyze_document(document)["issues"]}
    assert {
        "reference.duplicate_id",
        "reference.missing",
        "reference.membership",
        "binding.invalid_path",
        "binding.invalid_range",
    } <= codes


def test_shuffling_entities_preserves_diagnostic_ids_and_evidence_entity_ids() -> None:
    document = load_fixture()
    expected = [
        (item["id"], item["code"], item["subjectId"])
        for item in analyze_document(document)["issues"]
    ]
    for value in document.values():
        if isinstance(value, list):
            value.reverse()
    assert [
        (item["id"], item["code"], item["subjectId"])
        for item in analyze_document(document)["issues"]
    ] == expected


def test_binding_cycle_is_diagnosed_without_mutating_targets() -> None:
    document = load_fixture()
    document["bindings"].append(
        {
            "id": "loop",
            "source": {"entityId": "track_tension", "path": "gainDb"},
            "target": {"entityId": "char_kael", "path": "traits.paranoia"},
            "mapping": {"kind": "identity"},
        }
    )
    before = deepcopy(document)
    assert issues(document, "binding.cycle")
    assert document == before


def test_unsupported_constraints_warn_even_without_character_appearances() -> None:
    document = load_fixture()
    document["characters"][0]["constraints"][0]["type"] = "magic_oath"
    document["layers"] = [
        layer for layer in document["layers"] if layer["characterId"] != "char_kael"
    ]
    assert issues(document, "physical.unsupported_constraint")
