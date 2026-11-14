"""Stage edits upgrade only accepted snapshots; trusted inverses restore exact presence."""
import copy
from typing import TYPE_CHECKING, Any, cast

from app.commands import CommandError, _unique_entity, ensure_valid_document

if TYPE_CHECKING:
    from app.svg_assets import SvgAssetStore


def _find(document: dict[str, Any], collection: str, target: str) -> dict[str, Any]:
    _unique_entity(document, target)
    result = next((item for item in document[collection] if item["id"] == target), None)
    if result is None:
        raise CommandError(404, "TARGET_NOT_FOUND", "The target does not exist")
    return cast(dict[str, Any], result)


def apply_stage_operation(
    document: dict[str, Any], operation: dict[str, Any], asset_store: "SvgAssetStore | None",
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], list[str]]:
    result = copy.deepcopy(document)
    if result["schemaVersion"] == "0.1.0" and operation["op"] != "setShotLayoutOverride":
        result["schemaVersion"] = "0.2.0"
    op, target, args = operation["op"], operation["targetId"], operation["args"]
    changed = [target]
    if op == "setShotLayoutOverride":
        shot = _find(result, "shots", target)
        transforms = args["layerTransforms"]
        overrides = shot.get("layoutOverrides", {})
        previous = overrides.get("9:16")
        for layer_id in transforms or {}:
            layer = _find(result, "layers", layer_id)
            if (layer["shotId"] != target or shot["layerIds"].count(layer_id) != 1
                    or any(layer_id in other["layerIds"] for other in result["shots"]
                           if other is not shot)):
                raise CommandError(422, "INVALID_LAYER_MEMBERSHIP",
                                   "Portrait layers must be uniquely owned and listed by the shot")
        if transforms is None:
            if previous is None:
                raise CommandError(422, "NO_CHANGE", "The portrait override is already absent")
            del overrides["9:16"]
        else:
            replacement = {"layerTransforms": copy.deepcopy(transforms)}
            if previous == replacement:
                raise CommandError(422, "NO_CHANGE", "The portrait override is unchanged")
            shot.setdefault("layoutOverrides", {})["9:16"] = replacement
        changed.extend((previous or {}).get("layerTransforms", {}))
        changed.extend(transforms or {})
    elif op == "setShotCamera":
        shot = _find(result, "shots", target)
        shot["camera"] = copy.deepcopy(args["camera"])
    elif op == "setLayerAppearance":
        _find(result, "layers", target).update(copy.deepcopy(args))
    elif op in {"setLayerKeyframe", "deleteLayerKeyframe"}:
        layer = _find(result, "layers", target)
        frames = layer.setdefault("keyframes", [])
        keyframe_id = args["keyframeId"]
        existing = _unique_entity(result, keyframe_id)
        old = next((frame for frame in frames if frame["id"] == keyframe_id), None)
        changed.append(keyframe_id)
        if op == "deleteLayerKeyframe":
            if old is None:
                raise CommandError(404, "KEYFRAME_NOT_FOUND", "The keyframe does not exist")
            frames.remove(old)
        else:
            shot = _find(result, "shots", layer["shotId"])
            if args["timeMs"] < 0 or args["timeMs"] > shot["durationMs"]:
                raise CommandError(422, "INVALID_KEYFRAME_TIME", "Time exceeds the shot duration")
            if old is None and existing is not None:
                raise CommandError(422, "ENTITY_ID_USED", "Keyframe ID must be globally unused")
            if any(frame["timeMs"] == args["timeMs"] and frame is not old for frame in frames):
                raise CommandError(422, "KEYFRAME_TIME_USED", "Keyframe time must be unique")
            if old is None and len(frames) >= 128:
                raise CommandError(422, "KEYFRAME_LIMIT", "At most 128 keyframes per layer")
            frame = {"id": keyframe_id, "timeMs": args["timeMs"],
                     "transform": copy.deepcopy(args["transform"])}
            if old is not None:
                frames[frames.index(old)] = frame
            else:
                frames.append(frame)
            frames.sort(key=lambda frame: (frame["timeMs"], frame["id"]))
    elif op in {"importSvgLayer", "editSvgElement"}:
        if asset_store is None:
            raise CommandError(422, "ASSET_STORE_REQUIRED", "SVG storage is unavailable")
        if op == "importSvgLayer":
            shot = _find(result, "shots", target)
            asset_id, layer_id = args["assetId"], args["layerId"]
            if asset_id == layer_id or any(_unique_entity(result, value) is not None
                                          for value in [asset_id, layer_id]):
                raise CommandError(422, "ENTITY_ID_USED", "Imported IDs must be globally unused")
            imported = asset_store.import_svg(args["svg"])
            result["assets"].append({"id": asset_id, "name": args["name"], "kind": "svg",
                                     "uri": imported["uri"], "sourceUri": imported["sourceUri"],
                                     "rights": args["rights"]})
            box = imported["svg"]["viewBox"]
            result["layers"].append({"id": layer_id, "shotId": target, "name": args["name"],
                                     "kind": "svg_plane", "assetId": asset_id,
                                     "characterId": None, "pose": None, "transform": {
                                         "x": 0, "y": 0, "z": 0, "rotationDeg": 0,
                                         "scale": min(1, 200 / max(box["width"], box["height"]))}})
            shot["layerIds"].append(layer_id)
            changed.extend([asset_id, layer_id])
        else:
            asset = _find(result, "assets", target)
            if asset["kind"] != "svg":
                raise CommandError(422, "INVALID_TARGET", "Only SVG assets can be edited")
            edited = asset_store.edit_svg(asset["uri"], args["elementId"], args["attributes"])
            from app.rigs import validate_rig_bindings
            if any(layer.get("rig") and layer.get("assetId") == target
                   and validate_rig_bindings(layer["rig"], dict(edited["svg"]))
                   for layer in result["layers"]):
                raise CommandError(422, "INVALID_RIG", "SVG edit invalidates rig bindings")
            asset.setdefault("sourceUri", asset["uri"])
            asset["uri"] = edited["uri"]
    changed = sorted(set(changed))
    ensure_valid_document(result)
    # Replaying SVG commands uses committed metadata, never creates IDs/files again.
    forward = {"op": "restoreStageSnapshot", "targetId": target,
               "args": {"document": copy.deepcopy(result), "changedEntityIds": changed}}
    inverse = {"op": "restoreStageSnapshot", "targetId": target,
               "args": {"document": copy.deepcopy(document), "changedEntityIds": changed}}
    return result, forward, inverse, changed
