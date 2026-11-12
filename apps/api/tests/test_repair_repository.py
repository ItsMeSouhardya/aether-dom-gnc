"""Atomic persistence and exact inverses independent of derived analysis."""

import copy
from pathlib import Path

import pytest
from sqlalchemy import event, select

from app.commands import CommandError, apply_operation
from app.contracts import load_fixture
from app.persistence.tables import commands, snapshots
from app.repository import Repository
from tests.test_repair_commands import command


def test_recovery_rolls_back_snapshot_on_audit_insert_failure(tmp_path: Path) -> None:
    repository = Repository(tmp_path / "rollback.sqlite3")
    repository.initialize()
    before = repository.get("proj_neon_shogun", "branch_main")

    def reject_audit(connection, cursor, statement, parameters, context, executemany):
        if statement.startswith("INSERT INTO commands"):
            raise RuntimeError("injected audit write failure")

    event.listen(repository.engine, "before_cursor_execute", reject_audit)
    try:
        with pytest.raises(RuntimeError, match="injected audit"):
            repository.execute("proj_neon_shogun", "branch_main", command(
                op="recordConstraintRecovery",
            ))
        assert repository.get("proj_neon_shogun", "branch_main") == before
        with repository.engine.connect() as connection:
            assert len(list(connection.execute(select(snapshots)))) == 1
            assert list(connection.execute(select(commands))) == []
    finally:
        event.remove(repository.engine, "before_cursor_execute", reject_audit)
        repository.close()


@pytest.mark.parametrize("field,value", [
    ("type", "unhandled_constraint"), ("effectiveFromEventId", "missing"),
])
def test_invalid_recovery_preserves_input(field: str, value: str) -> None:
    document = load_fixture()
    document["characters"][0]["constraints"][0][field] = value
    original = copy.deepcopy(document)
    payload = command(op="recordConstraintRecovery")
    operation = {key: payload[key] for key in ("op", "targetId", "args")}
    with pytest.raises(CommandError) as error:
        apply_operation(document, operation)
    assert error.value.status == 422
    assert document == original


def test_pose_inverse_restores_preexisting_long_authored_value() -> None:
    # The document contract permits longer poses than the new command input.
    document = load_fixture()
    document["layers"][1]["pose"] = "x" * 150
    original = copy.deepcopy(document)
    payload = command()
    changed, forward, inverse, ids = apply_operation(document, {
        key: payload[key] for key in ("op", "targetId", "args")
    })
    restored, _, _, _ = apply_operation(changed, inverse)
    assert document == original == restored
    assert forward["op"] == "setLayerPose"
    assert ids == ["char_kael", "layer_kael"]
