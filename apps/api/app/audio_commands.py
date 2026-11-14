"""Authored editorial tension is optional; trusted snapshots preserve exact undo."""
import copy
from typing import Any

from app.commands import CommandError, _unique_entity, ensure_valid_document


def apply_audio_operation(
    document: dict[str, Any], operation: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], list[str]]:
    result = copy.deepcopy(document)
    target = operation["targetId"]
    _unique_entity(result, target)
    shot = next((item for item in result["shots"] if item["id"] == target), None)
    if shot is None:
        raise CommandError(404, "TARGET_NOT_FOUND", "The target shot does not exist")
    if result["schemaVersion"] in {"0.1.0", "0.2.0"}:
        result["schemaVersion"] = "0.3.0"
    shot["audio"] = {"tension": operation["args"]["tension"]}
    ensure_valid_document(result)
    changed = [target]
    # Reuse the established private snapshot operation, never a public command.
    forward = {"op": "restoreStageSnapshot", "targetId": target,
               "args": {"document": copy.deepcopy(result), "changedEntityIds": changed}}
    inverse = {"op": "restoreStageSnapshot", "targetId": target,
               "args": {"document": copy.deepcopy(document), "changedEntityIds": changed}}
    return result, forward, inverse, changed
