"""Bounded, pure branch contracts and deterministic authored three-way comparison."""

import copy
import json
import math
import re
from datetime import datetime
from typing import Any, cast

from jsonschema import Draft202012Validator

from app.commands import CommandError
from app.contracts import SCHEMA_ROOT

MAX_BRANCHES = 64
MAX_CHANGES = 4096
MAX_BYTES = 1048576
COLLECTIONS = ("characters", "events", "scenes", "shots", "assets", "layers",
               "audioTracks", "bindings")
ROUTE_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,127}")
WHITESPACE = frozenset("\t\n\v\f\r \u0085\u00a0\u1680\u2000\u2001\u2002\u2003"
                       "\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029"
                       "\u202f\u205f\u3000\ufeff")


def _validator(name: str) -> Draft202012Validator:
    schema = json.loads((SCHEMA_ROOT / f"{name}.schema.json").read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema)


FORK_VALIDATOR = _validator("fork-branch")
LIST_VALIDATOR = _validator("branch-list")
DIFF_VALIDATOR = _validator("branch-diff")
RESULT_VALIDATOR = _validator("fork-result")


def invalid(message: str = "Invalid bounded branch contract") -> CommandError:
    return CommandError(422, "INVALID_BRANCH_CONTRACT", message)


def validate_route_ids(*identities: str) -> None:
    if any(not ROUTE_ID.fullmatch(identity) for identity in identities):
        raise invalid("Invalid project or branch identity")


def bounded(value: object, byte_limit: int | None, max_depth: int = 32) -> None:
    pending: list[tuple[object, int]] = [(value, 0)]
    seen: set[int] = set()
    count = 0
    numeric_budget = 0
    while pending:
        child, depth = pending.pop()
        count += 1
        if count > 200000 or depth > max_depth:
            raise invalid("Branch JSON exceeds structural bounds")
        if isinstance(child, str):
            if any(0xD800 <= ord(char) <= 0xDFFF for char in child):
                raise invalid("Branch text must contain Unicode scalar values")
        elif isinstance(child, (int, float)):
            try:
                finite = math.isfinite(child)
            except OverflowError:
                finite = False
            if not finite:
                raise invalid("Branch numbers must be finite")
            if not isinstance(child, bool):
                # Reserve JS decimal expansion of exponent notation on the wire.
                numeric_budget += 16
        elif isinstance(child, (list, dict)):
            if id(child) in seen:
                raise invalid("Branch JSON must be a tree")
            seen.add(id(child))
            if isinstance(child, dict):
                for key, item in child.items():
                    if not isinstance(key, str):
                        raise invalid()
                    pending.extend([(key, depth + 1), (item, depth + 1)])
            else:
                pending.extend((item, depth + 1) for item in child)
        elif child is not None:
            raise invalid()
    if byte_limit is not None:
        size = len(json.dumps(value, ensure_ascii=False, separators=(",", ":"),
                              allow_nan=False).encode("utf-8"))
        if size + numeric_budget > byte_limit:
            raise invalid("Branch JSON exceeds its byte limit")


def _name(value: str) -> bool:
    return any(char not in WHITESPACE for char in value)


def validate_fork_command(value: object) -> dict[str, Any]:
    bounded(value, 8192)
    if not FORK_VALIDATOR.is_valid(value):
        raise invalid("Invalid fork command")
    command = cast(dict[str, Any], value)
    if not _name(command["name"]) or command["newBranchId"] == command["sourceBranchId"]:
        raise invalid("Fork requires a distinct ID and a non-whitespace name")
    return copy.deepcopy(command)


def _summary_valid(branch: dict[str, Any]) -> bool:
    return (_name(branch["name"]) and branch["baseRevision"] <= branch["headRevision"]
            and branch["parentId"] != branch["id"])


def validate_branch_list(value: object) -> dict[str, Any]:
    bounded(value, 131072)
    if not LIST_VALIDATOR.is_valid(value):
        raise invalid("Invalid branch list")
    result = cast(dict[str, Any], value)
    indexed = {branch["id"]: branch for branch in result["branches"]}
    if (len(indexed) != len(result["branches"])
            or any(not _summary_valid(branch) for branch in result["branches"])):
        raise invalid("Invalid branch identities or revisions")
    for branch in result["branches"]:
        seen: set[str] = set()
        current = branch
        while current:
            if current["id"] in seen:
                raise invalid("Cyclic branch lineage")
            seen.add(current["id"])
            if current["parentId"] is None:
                break
            parent = indexed.get(current["parentId"])
            if (parent is None or not parent["baseRevision"] <= current["baseRevision"]
                    <= parent["headRevision"]):
                raise invalid("Missing or inconsistent branch ancestor")
            current = parent
    return result


def validate_fork_result(value: object) -> dict[str, Any]:
    bounded(value, 16384)
    if not RESULT_VALIDATOR.is_valid(value):
        raise invalid("Invalid fork result")
    result = cast(dict[str, Any], value)
    branch, receipt = result["branch"], result["receipt"]
    try:
        datetime.fromisoformat(receipt["createdAt"])
    except ValueError as exc:
        raise invalid("Invalid fork timestamp") from exc
    if (not _summary_valid(branch) or branch["id"] != receipt["branchId"]
            or branch["parentId"] != receipt["sourceBranchId"]
            or branch["baseRevision"] != receipt["sourceRevision"]
            or branch["headRevision"] != receipt["sourceRevision"]):
        raise invalid("Inconsistent fork receipt")
    return result


def _equal(left: Any, right: Any) -> bool:
    # Python bool/int equality must not collapse distinct JSON authored values.
    if isinstance(left, bool) != isinstance(right, bool):
        return False
    if isinstance(left, dict) and isinstance(right, dict):
        return left.keys() == right.keys() and all(_equal(left[k], right[k]) for k in left)
    if isinstance(left, list) and isinstance(right, list):
        return len(left) == len(right) and all(
            _equal(a, b) for a, b in zip(left, right, strict=True)
        )
    return bool(left == right)


def _status(change: dict[str, Any]) -> str | None:
    def same(a: str, b: str) -> bool:
        return (change[f"{a}Present"] == change[f"{b}Present"]
                and _equal(change[a], change[b]))
    left, right = not same("base", "left"), not same("base", "right")
    if left and right:
        return "same_change" if same("left", "right") else "conflict"
    return "left_only" if left else "right_only" if right else None


def validate_branch_diff(value: object) -> dict[str, Any]:
    bounded(value, MAX_BYTES)
    if not DIFF_VALIDATOR.is_valid(value):
        raise invalid("Invalid three-way comparison")
    result = cast(dict[str, Any], value)
    base, left, right = (result[key] for key in ("base", "left", "right"))
    if (base["revision"] > min(left["revision"], right["revision"])
            or (left["branchId"] == right["branchId"]
                and (left["revision"] != right["revision"] or result["changes"]))):
        raise invalid("Inconsistent comparison revisions")
    paths: set[tuple[str, str, str]] = set()
    for change in result["changes"]:
        key = (change["collection"], change["entityId"], change["path"])
        if (key in paths or _status(change) != change["status"]
                or any(not change[f"{side}Present"] and change[side] is not None
                       for side in ("base", "left", "right"))
                or (change["collection"] in ("document", "project", "provenance")
                    and change["entityId"] != result["projectId"])):
            raise invalid("Inconsistent comparison change")
        paths.add(key)
    if result["conflictCount"] != sum(c["status"] == "conflict" for c in result["changes"]):
        raise invalid("Inconsistent conflict count")
    return result


def compare_documents(
    base: dict[str, Any], left: dict[str, Any], right: dict[str, Any],
    base_ref: dict[str, Any], left_ref: dict[str, Any], right_ref: dict[str, Any],
) -> dict[str, Any]:
    """Entity arrays match by stable ID; authored arrays are atomic JSON values."""
    # Separate snapshots may share references in pure callers; copy makes the
    # bounded tree check independent of object aliasing across those documents.
    for document in (base, left, right):
        bounded(document, None)
    documents = [copy.deepcopy(document) for document in (base, left, right)]
    # Count the complete input together without rejecting shared immutable data.
    bounded(documents, None, max_depth=33)
    project_id = base["project"]["id"]
    if any(document["project"]["id"] != project_id for document in documents):
        raise invalid("Comparison project identities differ")
    changes: list[dict[str, Any]] = []

    def walk(collection: str, entity_id: str, path: str, values: list[Any],
             present: list[bool]) -> None:
        if all(present) and all(isinstance(value, dict) for value in values):
            keys = sorted(set().union(*(value.keys() for value in values)))
            for key in keys:
                escaped = key.replace("~", "~0").replace("/", "~1")
                walk(collection, entity_id, f"{path}/{escaped}",
                     [value.get(key) for value in values], [key in value for value in values])
            return
        change: dict[str, Any] = {
            "collection": collection, "entityId": entity_id, "path": path or "/",
        }
        for side, value, exists in zip(("base", "left", "right"), values, present, strict=True):
            change[side] = value if exists else None
            change[f"{side}Present"] = exists
        status = _status(change)
        if status:
            change["status"] = status
            changes.append(change)
            if len(changes) > MAX_CHANGES:
                raise invalid("Comparison exceeds 4096 changes")

    walk("document", project_id, "/schemaVersion", [d["schemaVersion"] for d in documents],
         [True, True, True])
    projects = [{k: v for k, v in d["project"].items()
                 if k not in ("revision", "activeBranchId")} for d in documents]
    walk("project", project_id, "", projects, [True, True, True])
    walk("provenance", project_id, "", [d["provenance"] for d in documents], [True, True, True])
    for collection in COLLECTIONS:
        maps: list[dict[str, Any]] = []
        for document in documents:
            entities = document[collection]
            indexed = {entity["id"]: entity for entity in entities}
            if len(indexed) != len(entities):
                raise invalid("Duplicate entity identity")
            maps.append(indexed)
        for entity_id in sorted(set().union(*(indexed.keys() for indexed in maps))):
            walk(collection, entity_id, "", [indexed.get(entity_id) for indexed in maps],
                 [entity_id in indexed for indexed in maps])
    changes.sort(key=lambda change: (change["collection"], change["entityId"], change["path"]))
    return validate_branch_diff({"projectId": project_id, "base": base_ref, "left": left_ref,
                                 "right": right_ref, "changes": changes,
                                 "conflictCount": sum(c["status"] == "conflict" for c in changes)})
