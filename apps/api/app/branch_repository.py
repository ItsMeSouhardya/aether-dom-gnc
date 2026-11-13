"""Transactional branch creation and read-only lineage-aware comparisons."""

from copy import deepcopy
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Connection, RowMapping, select

from app.branch_domain import (
    MAX_BRANCHES,
    compare_documents,
    validate_branch_list,
    validate_fork_command,
    validate_fork_result,
    validate_route_ids,
)
from app.commands import CommandError, _unique_entity, ensure_valid_document
from app.persistence.tables import branch_forks, branches, commands, snapshots

if TYPE_CHECKING:
    from app.repository import Repository


def _lineage_error() -> CommandError:
    return CommandError(409, "INVALID_BRANCH_LINEAGE", "Branch lineage is missing or inconsistent")


class BranchRepository:
    def __init__(self, repository: "Repository") -> None:
        self.repository = repository

    def _document(self, connection: Connection, project: str, branch: str,
                  revision: int) -> dict[str, Any]:
        document: dict[str, Any] | None = connection.execute(select(snapshots.c.document).where(
            snapshots.c.project_id == project, snapshots.c.branch_id == branch,
            snapshots.c.revision == revision,
        )).scalar_one_or_none()
        if (document is None or document["project"]["id"] != project
                or document["project"]["activeBranchId"] != branch
                or document["project"]["revision"] != revision):
            raise _lineage_error()
        return document

    def _summaries(self, connection: Connection, project: str) -> list[dict[str, Any]]:
        rows = list(connection.execute(select(branches).where(
            branches.c.project_id == project,
        ).order_by(branches.c.branch_id)).mappings())
        if not rows:
            raise CommandError(404, "PROJECT_NOT_FOUND", "The project does not exist")
        if len(rows) > MAX_BRANCHES:
            raise _lineage_error()
        lineage = {row["branch_id"]: row for row in connection.execute(select(branch_forks).where(
            branch_forks.c.project_id == project,
        )).mappings()}
        if not set(lineage) <= {row["branch_id"] for row in rows}:
            raise _lineage_error()
        result: list[dict[str, Any]] = []
        for row in rows:
            document = self._document(connection, project, row["branch_id"], row["revision"])
            matches = [b for b in document["branches"] if b["id"] == row["branch_id"]]
            if len(matches) != 1:
                raise _lineage_error()
            own = matches[0]
            fork = lineage.get(row["branch_id"])
            if fork is None:
                if own["parentId"] is not None:
                    raise _lineage_error()
                summary = {**own, "headRevision": row["revision"]}
            else:
                try:
                    record = validate_fork_result(fork["result"])
                    payload = validate_fork_command(fork["payload"])
                except CommandError as exc:
                    raise _lineage_error() from exc
                receipt, initial = record["receipt"], record["branch"]
                if (fork["source_branch_id"] != initial["parentId"]
                        or fork["source_revision"] != initial["baseRevision"]
                        or fork["branch_id"] != initial["id"]
                        or fork["command_id"] != receipt["commandId"]
                        or payload["projectId"] != project
                        or payload["newBranchId"] != initial["id"]
                        or payload["sourceBranchId"] != initial["parentId"]
                        or payload["expectedRevision"] != initial["baseRevision"]
                        or payload["commandId"] != receipt["commandId"]
                        or payload["actor"] != receipt["actor"]
                        or payload["reason"] != receipt["reason"]
                        or payload["name"] != initial["name"]
                        or any(own[key] != initial[key]
                               for key in ("id", "name", "parentId", "baseRevision"))):
                    raise _lineage_error()
                summary = {**initial, "headRevision": row["revision"]}
            result.append(summary)
        try:
            validate_branch_list({"projectId": project, "branches": result})
        except CommandError as exc:
            raise _lineage_error() from exc
        return result

    def list(self, project: str) -> dict[str, Any]:
        validate_route_ids(project)
        with self.repository.engine.connect() as connection:
            connection.exec_driver_sql("BEGIN")
            return {"projectId": project, "branches": self._summaries(connection, project)}

    def fork(self, project: str, value: object) -> dict[str, Any]:
        validate_route_ids(project)
        payload = validate_fork_command(value)
        if payload["projectId"] != project:
            raise CommandError(422, "COMMAND_SCOPE_MISMATCH", "Command and route identities differ")
        with self.repository.engine.connect() as connection:
            connection.exec_driver_sql("BEGIN IMMEDIATE")
            previous = connection.execute(select(branch_forks).where(
                branch_forks.c.command_id == payload["commandId"],
            )).mappings().first()
            if previous is not None:
                if previous["payload"] != payload:
                    raise CommandError(409, "COMMAND_ID_REUSED",
                                       "Command ID already has another payload")
                return deepcopy(validate_fork_result(previous["result"]))
            if connection.execute(select(commands.c.command_id).where(
                commands.c.command_id == payload["commandId"],
            )).first():
                raise CommandError(409, "COMMAND_ID_REUSED",
                                   "Command ID already has another payload")
            source = self.repository._branch(connection, project, payload["sourceBranchId"])
            if source["revision"] != payload["expectedRevision"]:
                raise CommandError(
                    409, "REVISION_CONFLICT", "Reload the source branch before forking",
                    currentRevision=source["revision"],
                )
            summaries = self._summaries(connection, project)
            if len(summaries) >= MAX_BRANCHES:
                raise CommandError(409, "BRANCH_LIMIT", "The project already has 64 branches")
            current = self._document(connection, project, source["branch_id"], source["revision"])
            new_id = payload["newBranchId"]
            if any(b["id"] == new_id for b in summaries) or _unique_entity(current, new_id):
                raise CommandError(409, "BRANCH_ID_EXISTS", "The new branch ID is already used")
            child = {"id": new_id, "name": payload["name"], "parentId": source["branch_id"],
                     "baseRevision": source["revision"], "headRevision": source["revision"]}
            document = deepcopy(current)
            document["project"]["activeBranchId"] = new_id
            document["branches"].append(child)
            ensure_valid_document(document)
            result = validate_fork_result({"branch": child, "receipt": {
                "commandId": payload["commandId"], "sourceBranchId": source["branch_id"],
                "sourceRevision": source["revision"], "branchId": new_id,
                "actor": payload["actor"], "reason": payload["reason"],
                "createdAt": datetime.now(UTC).isoformat(),
            }})
            connection.execute(branches.insert().values(
                project_id=project, branch_id=new_id, revision=source["revision"],
                undo_stack=[], redo_stack=[],
            ))
            connection.execute(snapshots.insert().values(
                project_id=project, branch_id=new_id, revision=source["revision"],
                document=document,
            ))
            connection.execute(branch_forks.insert().values(
                command_id=payload["commandId"], project_id=project, branch_id=new_id,
                source_branch_id=source["branch_id"], source_revision=source["revision"],
                payload=payload, result=result,
            ))
            connection.commit()
            return result

    def diff(self, project: str, left: str, right: str) -> dict[str, Any]:
        validate_route_ids(project, left, right)
        with self.repository.engine.connect() as connection:
            connection.exec_driver_sql("BEGIN")
            left_head = self.repository._branch(connection, project, left)
            right_head = self.repository._branch(connection, project, right)
            summaries = {b["id"]: b for b in self._summaries(connection, project)}

            def ancestry(head: RowMapping) -> dict[str, int]:
                current, bound = head["branch_id"], head["revision"]
                result: dict[str, int] = {}
                while True:
                    if current in result or current not in summaries or len(result) >= MAX_BRANCHES:
                        raise _lineage_error()
                    branch = summaries[current]
                    if not branch["baseRevision"] <= bound <= branch["headRevision"]:
                        raise _lineage_error()
                    self._document(connection, project, current, bound)
                    result[current] = bound
                    if branch["parentId"] is None:
                        return result
                    bound = min(bound, branch["baseRevision"])
                    current = branch["parentId"]

            left_path, right_path = ancestry(left_head), ancestry(right_head)
            common = next((branch for branch in left_path if branch in right_path), None)
            if common is None:
                raise CommandError(409, "NO_COMMON_BASE", "These branches have no common ancestor")
            revision = min(left_path[common], right_path[common])
            base = self._document(connection, project, common, revision)
            return compare_documents(
                base,
                self._document(connection, project, left, left_head["revision"]),
                self._document(connection, project, right, right_head["revision"]),
                {"branchId": common, "revision": revision},
                {"branchId": left, "revision": left_head["revision"]},
                {"branchId": right, "revision": right_head["revision"]},
            )
