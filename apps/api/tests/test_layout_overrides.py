import copy
from pathlib import Path

import pytest

from app.commands import CommandError, apply_operation, validate_command
from app.contracts import load_fixture
from app.repository import Repository


def command(revision=0, transforms=None, command_id="portrait"):
    return {
        "commandId": command_id,
        "projectId": "proj_neon_shogun",
        "branchId": "branch_main",
        "expectedRevision": revision,
        "actor": {"kind": "human", "id": "creator"},
        "reason": "Portrait",
        "op": "setShotLayoutOverride",
        "targetId": "shot_rooftop",
        "args": {"aspectRatio": "9:16", "layerTransforms": transforms},
    }


def test_override_replaces_only_portrait_preserves_version_and_exact_inverse():
    original = load_fixture()
    transforms = {"layer_kael": {"x": 0.1, "y": 0.2, "z": 0.3, "scale": 0.8, "rotationDeg": 20}}
    value = validate_command(command(transforms=transforms))
    result, forward, inverse, changed = apply_operation(original, value)
    assert result["schemaVersion"] == original["schemaVersion"]
    assert result["layers"] == original["layers"]
    assert result["shots"][0]["layoutOverrides"]["9:16"]["layerTransforms"] == transforms
    assert set(changed) == {"shot_rooftop", "layer_kael", "layer_vance"}
    assert apply_operation(result, inverse)[0] == original
    assert apply_operation(original, forward)[0] == result
    assert load_fixture() == original


def test_override_null_removal_noop_and_membership():
    original = load_fixture()
    removed = apply_operation(original, validate_command(command()))[0]
    assert "9:16" not in removed["shots"][0]["layoutOverrides"]
    with pytest.raises(CommandError):
        apply_operation(removed, validate_command(command()))
    for target in ["missing", "asset_kael"]:
        transform = copy.deepcopy(original["layers"][0]["transform"])
        with pytest.raises(CommandError):
            apply_operation(original, validate_command(command(transforms={target: transform})))
    ambiguous = copy.deepcopy(original)
    ambiguous["characters"][0]["id"] = "layer_kael"
    with pytest.raises(CommandError):
        apply_operation(
            ambiguous,
            validate_command(
                command(transforms={"layer_kael": original["layers"][1]["transform"]})
            ),
        )


@pytest.mark.parametrize("change", [{"scale": 0}, {"x": float("inf")}, {"x": float("nan")}])
def test_override_invalid_full_transform_rejected(change):
    transform = {**load_fixture()["layers"][0]["transform"], **change}
    with pytest.raises(CommandError):
        validate_command(command(transforms={"layer_kael": transform}))


def test_override_count_partial_foreign_membership_and_all_versions():
    original = load_fixture()
    transform = original["layers"][1]["transform"]
    for transforms in [{"layer_kael": {"x": 0}}, {str(i): transform for i in range(65)}]:
        with pytest.raises(CommandError):
            validate_command(command(transforms=transforms))
    for version in ["0.1.0", "0.2.0", "0.3.0"]:
        document = copy.deepcopy(original)
        document["schemaVersion"] = version
        result = apply_operation(document, validate_command(command()))[0]
        assert result["schemaVersion"] == version
    document = copy.deepcopy(original)
    document["shots"][0]["layerIds"].remove("layer_kael")
    with pytest.raises(CommandError):
        apply_operation(document, validate_command(command(transforms={"layer_kael": transform})))
    document = copy.deepcopy(original)
    document["layers"][1]["shotId"] = "another_shot"
    with pytest.raises(CommandError):
        apply_operation(document, validate_command(command(transforms={"layer_kael": transform})))


def test_override_replay_restart_stale_and_undo(tmp_path: Path):
    path = tmp_path / "layout.sqlite3"
    repository = Repository(path)
    repository.initialize()
    payload = command()
    result = repository.execute("proj_neon_shogun", "branch_main", payload)
    assert repository.execute("proj_neon_shogun", "branch_main", payload) == result
    with pytest.raises(CommandError):
        repository.execute("proj_neon_shogun", "branch_main", command(command_id="stale"))
    repository.close()
    repository = Repository(path)
    repository.initialize()
    assert repository.get("proj_neon_shogun", "branch_main")["document"] == result["document"]
    undo = {k: v for k, v in command(1, command_id="undo").items() if k not in ["targetId", "args"]}
    undo["op"] = "undo"
    restored = repository.execute("proj_neon_shogun", "branch_main", undo)["document"]
    assert restored["shots"] == load_fixture()["shots"]
    assert restored["schemaVersion"] == "0.1.0"
    repository.close()
