"""Three-way field semantics and hostile JSON bounds, independent of SQLite."""

import copy
import json
from typing import Any

import pytest

from app.branch_domain import (
    bounded,
    compare_documents,
    validate_branch_diff,
    validate_branch_list,
    validate_fork_command,
)
from app.commands import CommandError
from app.contracts import SCHEMA_ROOT, load_fixture

PROJECT = "proj_neon_shogun"


def compare(base, left, right):
    return compare_documents(
        base, left, right, {"branchId": "main", "revision": 0},
        {"branchId": "left", "revision": 1}, {"branchId": "right", "revision": 1},
    )


def documents():
    return [load_fixture() for _ in range(3)]


def test_field_statuses_same_disjoint_conflicting_and_explicit_null():
    base, left, right = documents()
    left["layers"][0]["transform"]["x"] = right["layers"][0]["transform"]["x"] = 0.2
    left["layers"][0]["transform"]["y"] = 0.7
    right["layers"][0]["transform"]["z"] = 0.8
    left["layers"][1]["pose"] = "left"
    right["layers"][1]["pose"] = None
    before = copy.deepcopy([base, left, right])
    result = compare(base, left, right)
    changes = {(c["entityId"], c["path"]): c for c in result["changes"]}
    layer_id = base["layers"][0]["id"]
    assert changes[layer_id, "/transform/x"]["status"] == "same_change"
    assert changes[layer_id, "/transform/y"]["status"] == "left_only"
    assert changes[layer_id, "/transform/z"]["status"] == "right_only"
    pose = changes["layer_kael", "/pose"]
    assert pose["status"] == "conflict" and pose["right"] is None and pose["rightPresent"]
    assert result["conflictCount"] == 1
    assert [base, left, right] == before


def test_entity_add_delete_edit_and_missing_versus_null():
    base, left, right = documents()
    entity = {"id": "layer_added", "pose": None}
    left["layers"].append(entity)
    right["layers"].append(copy.deepcopy(entity))
    removed = left["layers"].pop(0)
    right["layers"][0]["transform"]["x"] = 0.4
    left["layers"][0].pop("pose")
    right["layers"][1]["pose"] = None
    changes = {(c["entityId"], c["path"]): c for c in compare(base, left, right)["changes"]}
    addition = changes["layer_added", "/"]
    assert addition["status"] == "same_change"
    assert not addition["basePresent"] and addition["base"] is None
    deletion = changes[removed["id"], "/"]
    assert deletion["status"] == "conflict" and not deletion["leftPresent"]
    assert deletion["left"] is None and deletion["base"] == removed
    pose = changes["layer_kael", "/pose"]
    assert not pose["leftPresent"] and pose["rightPresent"] and pose["right"] is None


def test_arrays_are_atomic_pointer_escaping_and_metadata_exclusion():
    base, left, right = documents()
    right["scenes"][0]["eventIds"] = list(reversed(base["scenes"][0]["eventIds"])) + ["new"]
    left["characters"][0]["traits"]["a/b~c"] = 0.3
    left["project"].update(revision=15, activeBranchId="other")
    left["branches"] = []
    right["branches"] = [{"arbitrary": "ignored"}]
    left["schemaVersion"] = "0.2.0"
    diff = compare(base, left, right)
    paths = {(c["collection"], c["path"]) for c in diff["changes"]}
    assert paths == {("document", "/schemaVersion"), ("characters", "/traits/a~1b~0c"),
                     ("scenes", "/eventIds")}
    assert compare(base, copy.deepcopy(base), copy.deepcopy(base))["changes"] == []


def test_objects_ignore_key_insertion_order_but_not_boolean_number_types():
    base, left, right = documents()
    left["characters"][0]["traits"] = dict(reversed(list(base["characters"][0]["traits"].items())))
    assert not compare(base, left, right)["changes"]
    left["layers"][0]["opacity"] = True
    right["layers"][0]["opacity"] = 1
    assert compare(base, left, right)["changes"][0]["status"] == "conflict"


@pytest.mark.parametrize("value", [float("nan"), float("inf"), "\ud800", object()])
def test_comparison_rejects_nonportable_json(value):
    base, left, right = documents()
    left["provenance"]["notes"] = value
    with pytest.raises(CommandError):
        compare(base, left, right)


def test_bounds_reject_cycles_deep_data_before_copy_and_large_change_sets():
    base, left, right = documents()
    deep: dict[str, Any] = {}
    for _ in range(1500):
        deep = {"child": deep}
    left["provenance"]["notes"] = deep
    with pytest.raises(CommandError, match="structural bounds"):
        compare(base, left, right)
    cyclic: dict[str, Any] = {}
    cyclic["self"] = cyclic
    with pytest.raises(CommandError, match="tree"):
        bounded(cyclic, 1048576)
    left = load_fixture()
    left["characters"][0]["traits"] = {str(i): i for i in range(4097)}
    with pytest.raises(CommandError, match="4096 changes"):
        compare(base, left, right)


@pytest.mark.parametrize("value", ["x" * 1048576, [0] * 200001, [1e20] * 50000])
def test_byte_value_and_conservative_numeric_wire_budgets(value):
    with pytest.raises(CommandError):
        bounded(value, 1048576)


def test_branch_list_requires_parent_creation_revision_not_after_child():
    value = {"projectId": PROJECT, "branches": [
        {"id": "root", "name": "Root", "parentId": None, "baseRevision": 0, "headRevision": 8},
        {"id": "parent", "name": "Parent", "parentId": "root", "baseRevision": 5,
         "headRevision": 8},
        {"id": "child", "name": "Child", "parentId": "parent", "baseRevision": 3,
         "headRevision": 8},
    ]}
    with pytest.raises(CommandError):
        validate_branch_list(value)


def test_shared_branch_contract_fixture_cases():
    cases = json.loads((SCHEMA_ROOT / "fixtures" / "branch-cases.json").read_text("utf-8"))
    validators = {"command": validate_fork_command, "list": validate_branch_list,
                  "diff": validate_branch_diff}
    for case in cases:
        if case["valid"]:
            validators[case["kind"]](case["value"])
        else:
            with pytest.raises(CommandError):
                validators[case["kind"]](case["value"])
