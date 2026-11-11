"""Pure domain behavior and actual SQLite durability/transaction evidence."""

import copy
import json
from pathlib import Path

import pytest
from sqlalchemy import event, select
from test_commands import command

from app.commands import CommandError, apply_transform
from app.contracts import load_fixture
from app.persistence.tables import branches, commands, snapshots
from app.repository import ROOT, Repository, resolve_database_path

PROJECT = "proj_neon_shogun"
BRANCH = "branch_main"


def test_apply_inverse_is_pure_and_restores_authored_document() -> None:
    original = load_fixture()
    before = copy.deepcopy(original)
    changed, forward, inverse = apply_transform(
        original, {"targetId": "layer_kael", "args": {"x": 0.125, "scale": 0.75}},
    )
    assert original == before
    assert changed["layers"][1]["transform"]["x"] == 0.125
    restored, _, _ = apply_transform(changed, inverse)
    assert restored == original
    reapplied, _, _ = apply_transform(restored, forward)
    assert reapplied == changed
    changed["layers"][1]["transform"]["y"] = 999
    assert forward["args"]["y"] == -0.1
    assert original == before


def test_invalid_result_rejects_without_mutating_input() -> None:
    original = load_fixture()
    before = copy.deepcopy(original)
    with pytest.raises(CommandError, match="resulting document"):
        apply_transform(original, {"targetId": "layer_kael", "args": {"scale": -1}})
    assert original == before


def test_database_paths_resolve_against_workspace_without_opening_database(
    tmp_path: Path, monkeypatch,
) -> None:
    monkeypatch.delenv("AETHER_DATABASE_PATH", raising=False)
    assert resolve_database_path() == ROOT / "data" / "aether-dom.sqlite3"
    monkeypatch.setenv("AETHER_DATABASE_PATH", "data/relative.sqlite3")
    assert resolve_database_path() == ROOT / "data" / "relative.sqlite3"
    explicit = tmp_path / "uncreated" / "explicit.sqlite3"
    repository = Repository(explicit)
    assert repository.path == explicit
    assert not explicit.parent.exists()
    repository.close()


def test_full_audit_and_old_snapshots_remain_immutable(tmp_path: Path) -> None:
    repository = Repository(tmp_path / "audit.sqlite3")
    repository.initialize()
    payload = command()
    first = repository.execute(PROJECT, BRANCH, payload)
    with repository.engine.connect() as connection:
        audit_before = dict(connection.execute(select(commands)).mappings().one())
        snapshots_before = [dict(row) for row in connection.execute(select(snapshots)).mappings()]
    repository.execute(PROJECT, BRANCH, command(1, "undo"))
    repository.execute(PROJECT, BRANCH, command(2, "redo"))
    first["document"]["layers"][1]["transform"]["x"] = 888
    with repository.engine.connect() as connection:
        audit_after = dict(connection.execute(select(commands).where(
            commands.c.command_id == payload["commandId"],
        )).mappings().one())
        snapshots_after = [dict(row) for row in connection.execute(select(snapshots).where(
            snapshots.c.revision <= 1,
        )).mappings()]
        assert audit_after == audit_before
        assert snapshots_after == snapshots_before
        assert audit_after["payload"] == payload
        assert audit_after["forward"]["args"]["x"] == -0.25
        assert audit_after["inverse"]["args"]["x"] == -0.65
        assert audit_after["receipt"]["createdAt"]
        assert audit_after["payload"]["actor"] == {"kind": "human", "id": "creator_1"}
    repository.close()


def test_failure_after_snapshot_insert_rolls_back_every_write(tmp_path: Path) -> None:
    repository = Repository(tmp_path / "rollback.sqlite3")
    repository.initialize()

    def fail_audit_insert(connection, cursor, statement, parameters, context, many):
        if statement.startswith("INSERT INTO commands"):
            raise RuntimeError("Simulated failed audit write after the snapshot insert")

    event.listen(repository.engine, "before_cursor_execute", fail_audit_insert)
    with pytest.raises(RuntimeError, match="failed audit write"):
        repository.execute(PROJECT, BRANCH, command())
    event.remove(repository.engine, "before_cursor_execute", fail_audit_insert)
    with repository.engine.connect() as connection:
        assert len(connection.execute(select(snapshots)).all()) == 1
        assert connection.execute(select(commands)).all() == []
        branch = connection.execute(select(branches)).mappings().one()
        assert branch["revision"] == 0
        assert branch["undo_stack"] == []
        assert branch["redo_stack"] == []
    assert repository.execute(PROJECT, BRANCH, command())["receipt"]["revision"] == 1
    repository.close()


def test_restart_command_replay_keeps_original_result(tmp_path: Path) -> None:
    path = tmp_path / "replay.sqlite3"
    first = Repository(path)
    first.initialize()
    result = first.execute(PROJECT, BRANCH, command())
    first.close()
    second = Repository(path)
    second.initialize()
    assert second.execute(PROJECT, BRANCH, command()) == result
    assert json.dumps(second.get(PROJECT, BRANCH), sort_keys=True) == json.dumps({
        key: value for key, value in result.items() if key != "receipt"
    }, sort_keys=True)
    second.close()
