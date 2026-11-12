"""Pure, schema-validated authored operations. UI and derived state never enter canon."""

import copy
import json
from typing import TYPE_CHECKING, Any, cast

from jsonschema import Draft202012Validator

from app.contracts import SCHEMA_ROOT, _portable_issues, validate_document

if TYPE_CHECKING:
    from app.svg_assets import SvgAssetStore

COMMAND_SCHEMA = json.loads((SCHEMA_ROOT / "command.schema.json").read_text(encoding="utf-8"))
Draft202012Validator.check_schema(COMMAND_SCHEMA)
COMMAND_VALIDATOR = Draft202012Validator(COMMAND_SCHEMA)


class CommandError(Exception):
    def __init__(self, status: int, code: str, message: str, **details: Any) -> None:
        self.status = status
        self.detail = {"code": code, "message": message, **details}
        super().__init__(message)


def validate_command(value: object) -> dict[str, Any]:
    """Reject malformed/non-finite commands without coercing or repairing input."""
    if _portable_issues(value) or not COMMAND_VALIDATOR.is_valid(value):
        raise CommandError(422, "INVALID_COMMAND", "Command violates the shared command schema")
    return cast(dict[str, Any], value)


def apply_transform(
    document: dict[str, Any], operation: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    """Copy/apply a partial transform, returning exact full forward/inverse transforms."""
    result = copy.deepcopy(document)
    layer = next(
        (layer for layer in result["layers"] if layer["id"] == operation["targetId"]), None,
    )
    if layer is None:
        raise CommandError(404, "TARGET_NOT_FOUND", "The target layer does not exist")
    inverse = {"targetId": layer["id"], "args": copy.deepcopy(layer["transform"])}
    layer["transform"].update(operation["args"])
    forward = {"targetId": layer["id"], "args": copy.deepcopy(layer["transform"])}
    ensure_valid_document(result)
    return result, forward, inverse


def _unique_entity(document: dict[str, Any], entity_id: str) -> dict[str, Any] | None:
    """Find IDs in all canonical collections, including nested constraints."""
    found: list[dict[str, Any]] = []
    pending: list[Any] = [document]
    while pending:
        value = pending.pop()
        if isinstance(value, dict):
            if value.get("id") == entity_id:
                found.append(value)
            pending.extend(value.values())
        elif isinstance(value, list):
            pending.extend(value)
    if len(found) > 1:
        raise CommandError(422, "AMBIGUOUS_REFERENCE", "Entity ID is not globally unique")
    return found[0] if found else None


def _constraint(
    document: dict[str, Any], target_id: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    matches = [(character, constraint) for character in document["characters"]
               for constraint in character["constraints"] if constraint["id"] == target_id]
    if not matches:
        raise CommandError(404, "TARGET_NOT_FOUND", "The target constraint does not exist")
    _unique_entity(document, target_id)
    character, constraint = matches[0]
    if constraint["type"] != "limb_injury":
        raise CommandError(422, "INVALID_TARGET", "Recovery requires a limb injury constraint")
    return character, constraint


def apply_operation(
    document: dict[str, Any], operation: dict[str, Any],
    asset_store: "SvgAssetStore | None" = None,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], list[str]]:
    """Apply typed edits and stored inverses, including Task 02 transform records."""
    op = operation.get("op", "setLayerTransform")
    if op == "restoreStageSnapshot":
        result = copy.deepcopy(operation["args"]["document"])
        ensure_valid_document(result)
        changed = operation["args"]["changedEntityIds"]
        inverse = {**operation, "args": {"document": copy.deepcopy(document),
                                        "changedEntityIds": changed}}
        return result, copy.deepcopy(operation), inverse, changed
    if op in {"setShotCamera", "setLayerAppearance", "importSvgLayer", "editSvgElement",
              "setLayerKeyframe", "deleteLayerKeyframe"}:
        from app.stage_commands import apply_stage_operation
        return apply_stage_operation(document, operation, asset_store)
    if op == "setLayerTransform":
        result, forward, inverse = apply_transform(document, operation)
        return result, forward, inverse, [operation["targetId"]]
    result = copy.deepcopy(document)
    target_id, args = operation["targetId"], operation["args"]
    if op == "setLayerPose":
        layer = next((item for item in result["layers"] if item["id"] == target_id), None)
        if layer is None:
            raise CommandError(404, "TARGET_NOT_FOUND", "The target layer does not exist")
        _unique_entity(result, target_id)
        character_id = layer["characterId"]
        if character_id is None or not any(
            item["id"] == character_id for item in result["characters"]
        ):
            raise CommandError(422, "INVALID_TARGET", "Pose requires an existing character")
        _unique_entity(result, character_id)
        inverse = {"op": op, "targetId": target_id, "args": {"pose": layer["pose"]}}
        layer["pose"] = args["pose"]
        forward = copy.deepcopy(operation)
        changed = [target_id, character_id]
    elif op in ("recordConstraintRecovery", "removeConstraintRecovery"):
        character, constraint = _constraint(result, target_id)
        scene = next((item for item in result["scenes"] if item["id"] == args["sceneId"]), None)
        if scene is None:
            raise CommandError(404, "SCENE_NOT_FOUND", "The recovery scene does not exist")
        _unique_entity(result, scene["id"])
        event_id = args["eventId"]
        if op == "recordConstraintRecovery":
            if constraint["resolvedByEventId"] is not None:
                raise CommandError(409, "ALREADY_RESOLVED", "The constraint is already resolved")
            if _unique_entity(result, event_id) is not None:
                raise CommandError(
                    422, "EVENT_ID_USED", "Recovery event ID must be globally unused",
                )
            start_id = constraint["effectiveFromEventId"]
            start = next((item for item in result["events"] if item["id"] == start_id), None)
            if start is None:
                raise CommandError(422, "INVALID_START_EVENT", "Injury start event does not exist")
            _unique_entity(result, start_id)
            if args["order"] <= start["order"] or any(
                event["order"] == args["order"] for event in result["events"]
            ):
                raise CommandError(
                    422, "INVALID_EVENT_ORDER", "Recovery order must be unique and later",
                )
            inverse = {"op": "removeConstraintRecovery", "targetId": target_id, "args": {
                "eventId": event_id, "sceneId": scene["id"],
                "eventIds": copy.deepcopy(scene["eventIds"]),
                "resolvedByEventId": constraint["resolvedByEventId"],
            }}
            result["events"].append({
                "id": event_id, "sceneId": scene["id"], "order": args["order"],
                "kind": "physical_recovery", "description": args["description"],
            })
            scene["eventIds"].append(event_id)
            constraint["resolvedByEventId"] = event_id
            forward = copy.deepcopy(operation)
        else:
            event = next((item for item in result["events"] if item["id"] == event_id), None)
            if event is None:
                raise CommandError(409, "INVALID_HISTORY", "Recovery event is missing from history")
            inverse = {"op": "recordConstraintRecovery", "targetId": target_id, "args": {
                "eventId": event_id, "sceneId": scene["id"], "order": event["order"],
                "description": event["description"],
            }}
            result["events"].remove(event)
            scene["eventIds"] = copy.deepcopy(args["eventIds"])
            constraint["resolvedByEventId"] = args["resolvedByEventId"]
            forward = copy.deepcopy(operation)
        changed = [target_id, character["id"], event_id, scene["id"]]
    else:
        raise CommandError(422, "INVALID_OPERATION", "Unsupported stored operation")
    ensure_valid_document(result)
    return result, forward, inverse, sorted(set(changed))


def ensure_valid_document(document: dict[str, Any]) -> None:
    if validate_document(document):
        raise CommandError(
            422, "INVALID_DOCUMENT", "The resulting document violates the .cdom schema",
        )
