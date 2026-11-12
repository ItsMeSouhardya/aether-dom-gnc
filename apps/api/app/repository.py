"""SQLite is the single canonical owner. All command effects commit in one write lock."""

import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from alembic import command as migration
from alembic.config import Config
from sqlalchemy import Connection, RowMapping, create_engine, select
from sqlalchemy.engine import URL

from app.commands import CommandError, apply_operation, ensure_valid_document, validate_command
from app.contracts import load_fixture
from app.persistence.tables import branches, commands, snapshots
from app.svg_assets import SvgAssetStore

ROOT = Path(__file__).resolve().parents[3]
API_ROOT = Path(__file__).resolve().parents[1]


def resolve_database_path(path: Path | None = None) -> Path:
    resolved = path if path is not None else Path(
        os.environ.get("AETHER_DATABASE_PATH", "data/aether-dom.sqlite3")
    )
    return (resolved if resolved.is_absolute() else ROOT / resolved).resolve()


class Repository:
    def __init__(self, database_path: Path | None = None, asset_root: Path | None = None) -> None:
        self.path = resolve_database_path(database_path)
        self.asset_root = asset_root if asset_root is not None else Path(
            os.environ.get("AETHER_ASSET_ROOT", str(ROOT)),
        )
        if not self.asset_root.is_absolute():
            self.asset_root = ROOT / self.asset_root
        self.asset_store = SvgAssetStore(self.asset_root)
        self.engine = create_engine(
            URL.create("sqlite", database=str(self.path)),
            connect_args={"check_same_thread": False, "timeout": 30},
        )

    def initialize(self) -> None:
        """Migrate and seed under the same cross-process SQLite write lock."""
        fixture = load_fixture()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.engine.connect() as connection:
            connection.exec_driver_sql("BEGIN IMMEDIATE")
            config = Config(str(API_ROOT / "alembic.ini"))
            config.attributes["connection"] = connection
            migration.upgrade(config, "head")
            project_id = fixture["project"]["id"]
            branch_id = fixture["project"]["activeBranchId"]
            if connection.execute(select(branches).where(
                branches.c.project_id == project_id, branches.c.branch_id == branch_id,
            )).first() is None:
                connection.execute(branches.insert().values(
                    project_id=project_id, branch_id=branch_id, revision=0,
                    undo_stack=[], redo_stack=[],
                ))
                connection.execute(snapshots.insert().values(
                    project_id=project_id, branch_id=branch_id, revision=0, document=fixture,
                ))
            connection.commit()

    def close(self) -> None:
        self.engine.dispose()

    def _branch(self, connection: Connection, project_id: str, branch_id: str) -> RowMapping:
        branch = connection.execute(select(branches).where(
            branches.c.project_id == project_id, branches.c.branch_id == branch_id,
        )).mappings().first()
        if branch is None:
            raise CommandError(404, "BRANCH_NOT_FOUND", "The project or branch does not exist")
        return branch

    def _snapshot(self, connection: Connection, branch: RowMapping) -> dict[str, Any]:
        project_id, branch_id, revision = (
            branch["project_id"], branch["branch_id"], branch["revision"],
        )
        document = connection.execute(select(snapshots.c.document).where(
            snapshots.c.project_id == project_id, snapshots.c.branch_id == branch_id,
            snapshots.c.revision == revision,
        )).scalar_one()
        entries = list(connection.execute(select(commands.c.receipt).where(
            commands.c.project_id == project_id, commands.c.branch_id == branch_id,
        ).order_by(commands.c.revision.desc()).limit(20)).scalars())
        return {"document": document, "history": {
            "canUndo": bool(branch["undo_stack"]), "canRedo": bool(branch["redo_stack"]),
            "entries": entries,
        }}

    def get(self, project_id: str, branch_id: str) -> dict[str, Any]:
        with self.engine.connect() as connection:
            # sqlite3 legacy mode does not BEGIN for SELECT automatically. Explicit
            # BEGIN keeps head, snapshot and history consistent during concurrent writes.
            connection.exec_driver_sql("BEGIN")
            return self._snapshot(connection, self._branch(connection, project_id, branch_id))

    def revision_document(
        self, project_id: str, branch_id: str, revision: int,
    ) -> dict[str, Any]:
        """Read an immutable predecessor for invalidation, never a moving head."""
        with self.engine.connect() as connection:
            self._branch(connection, project_id, branch_id)
            document: dict[str, Any] | None = connection.execute(select(snapshots.c.document).where(
                snapshots.c.project_id == project_id, snapshots.c.branch_id == branch_id,
                snapshots.c.revision == revision,
            )).scalar_one_or_none()
            if document is None:
                raise CommandError(404, "REVISION_NOT_FOUND", "The revision does not exist")
            return document

    def get_svg_asset(
        self, project_id: str, branch_id: str, asset_id: str, revision: int | None = None,
    ) -> dict[str, Any]:
        document = self.get(project_id, branch_id)["document"] if revision is None else (
            self.revision_document(project_id, branch_id, revision)
        )
        assets = [asset for asset in document["assets"] if asset["id"] == asset_id]
        if len(assets) != 1 or assets[0]["kind"] != "svg":
            raise CommandError(404, "ASSET_NOT_FOUND", "The SVG asset does not exist")
        asset = assets[0]
        return {"assetId": asset_id, "uri": asset["uri"],
                "sourceUri": asset.get("sourceUri", asset["uri"]),
                **self.asset_store.read_svg(asset["uri"])}

    def execute(self, project_id: str, branch_id: str, value: object) -> dict[str, Any]:
        payload = validate_command(value)
        if payload["projectId"] != project_id or payload["branchId"] != branch_id:
            raise CommandError(422, "COMMAND_SCOPE_MISMATCH", "Command and route identities differ")
        with self.engine.connect() as connection:
            # Reserve the write lock BEFORE checking revisions, across engines/processes.
            # Exceptions roll back all writes when the connection context exits.
            connection.exec_driver_sql("BEGIN IMMEDIATE")
            branch = self._branch(connection, project_id, branch_id)
            previous = connection.execute(select(commands).where(
                commands.c.command_id == payload["commandId"],
            )).mappings().first()
            if previous is not None:
                if previous["payload"] != payload:
                    raise CommandError(
                        409, "COMMAND_ID_REUSED", "Command ID already has another payload",
                    )
                return dict(previous["result"])
            revision = branch["revision"]
            if payload["expectedRevision"] != revision:
                raise CommandError(
                    409, "REVISION_CONFLICT", "Reload the current branch before editing",
                    currentRevision=revision,
                )
            current = self._snapshot(connection, branch)
            undo, redo = list(branch["undo_stack"]), list(branch["redo_stack"])
            op = payload["op"]
            if op not in ("undo", "redo"):
                operation = {"op": op, "targetId": payload["targetId"], "args": payload["args"]}
            else:
                stack = undo if op == "undo" else redo
                if not stack:
                    raise CommandError(409, "HISTORY_EMPTY", f"There is no action to {op}")
                source = connection.execute(select(commands).where(
                    commands.c.command_id == stack[-1],
                )).mappings().one()
                operation = source["inverse"] if op == "undo" else source["forward"]
            document, forward, inverse, changed_ids = apply_operation(
                current["document"], operation, self.asset_store,
            )
            revision += 1
            document["project"]["revision"] = revision
            for document_branch in document["branches"]:
                if document_branch["id"] == branch_id:
                    document_branch["headRevision"] = revision
            ensure_valid_document(document)
            if op not in ("undo", "redo"):
                undo.append(payload["commandId"])
                redo.clear()
            elif op == "undo":
                redo.append(undo.pop())
            else:
                undo.append(redo.pop())
            receipt = {
                "commandId": payload["commandId"], "revision": revision, "op": op,
                "targetId": operation["targetId"], "reason": payload["reason"],
                "createdAt": datetime.now(UTC).isoformat(),
                "changedEntityIds": changed_ids,
            }
            result = {"document": document, "receipt": receipt, "history": {
                "canUndo": bool(undo), "canRedo": bool(redo),
                "entries": [receipt, *current["history"]["entries"]][:20],
            }}
            connection.execute(snapshots.insert().values(
                project_id=project_id, branch_id=branch_id, revision=revision, document=document,
            ))
            connection.execute(commands.insert().values(
                command_id=payload["commandId"], project_id=project_id, branch_id=branch_id,
                revision=revision, payload=payload, forward=forward, inverse=inverse,
                receipt=receipt, result=result,
            ))
            connection.execute(branches.update().where(
                branches.c.project_id == project_id, branches.c.branch_id == branch_id,
            ).values(revision=revision, undo_stack=undo, redo_stack=redo))
            connection.commit()
            return result
