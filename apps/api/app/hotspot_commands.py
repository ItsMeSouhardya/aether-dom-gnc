import copy
from typing import Any

from app.commands import CommandError, _unique_entity, ensure_valid_document


def apply_hotspot_operation(
    document: dict[str, Any], operation: dict[str, Any]
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], list[str]]:
    result = copy.deepcopy(document)
    target = operation["targetId"]
    shot = next((s for s in result["shots"] if s["id"] == target), None)
    if shot is None:
        raise CommandError(404, "TARGET_NOT_FOUND", "Shot not found")
    _unique_entity(result, target)
    entries = shot.setdefault("hotspots", [])
    args = operation["args"]
    identifier = args["hotspot"]["id"] if operation["op"] == "setLoreHotspot" else args["hotspotId"]
    old = next((h for h in entries if h["id"] == identifier), None)
    changed = [target, identifier]
    if operation["op"] == "setLoreHotspot":
        hotspot = copy.deepcopy(args["hotspot"])
        collection = "characters" if hotspot["targetKind"] == "character" else "events"
        if not any(e["id"] == hotspot["targetId"] for e in result[collection]):
            raise CommandError(422, "INVALID_TARGET", "Lore target not found")
        _unique_entity(result, hotspot["targetId"])
        existing = _unique_entity(result, identifier)
        if old is None and existing is not None:
            raise CommandError(422, "ENTITY_ID_USED", "Hotspot ID must be globally unused")
        if old == hotspot:
            raise CommandError(422, "NO_CHANGE", "Hotspot is unchanged")
        if old is not None:
            changed.append(old["targetId"])
            entries[entries.index(old)] = hotspot
        else:
            entries.append(hotspot)
        changed.append(hotspot["targetId"])
    else:
        if old is None:
            raise CommandError(404, "TARGET_NOT_FOUND", "Hotspot not found in shot")
        changed.append(old["targetId"])
        entries.remove(old)
        if not entries:
            del shot["hotspots"]
    result["schemaVersion"] = "0.6.0"
    ensure_valid_document(result)
    changed = sorted(set(changed))

    def snapshot(value: dict[str, Any]) -> dict[str, Any]:
        return {
            "op": "restoreStageSnapshot",
            "targetId": target,
            "args": {"document": copy.deepcopy(value), "changedEntityIds": changed},
        }

    return result, snapshot(result), snapshot(document), changed
