"""Reversible edits to layer-owned articulated rigs."""

import copy
from typing import TYPE_CHECKING, Any

from app.commands import CommandError, _unique_entity, ensure_valid_document
from app.rigs import validate_rig, validate_rig_bindings
from app.svg_assets import parse_svg

if TYPE_CHECKING:
    from app.svg_assets import SvgAssetStore


def apply_rig_operation(
    document: dict[str, Any], operation: dict[str, Any], asset_store: "SvgAssetStore | None"
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], list[str]]:
    result = copy.deepcopy(document)
    result["schemaVersion"] = "0.5.0"
    op, target, args = operation["op"], operation["targetId"], operation["args"]
    changed = [target]
    if op == "importRigLayer":
        if asset_store is None:
            raise CommandError(422, "ASSET_STORE_REQUIRED", "SVG storage is unavailable")
        shot = next((s for s in result["shots"] if s["id"] == target), None)
        if shot is None:
            raise CommandError(404, "TARGET_NOT_FOUND", "Shot not found")
        _unique_entity(result, target)
        character = next((c for c in result["characters"] if c["id"] == args["characterId"]), None)
        if character is None:
            raise CommandError(422, "INVALID_TARGET", "An existing character is required")
        _unique_entity(result, args["characterId"])
        rig = copy.deepcopy(args["rig"])
        svg = parse_svg(args["svg"])
        if validate_rig(rig) or validate_rig_bindings(rig, dict(svg)):
            raise CommandError(422, "INVALID_RIG", "Rig or source bindings are invalid")
        ids = [args["assetId"], args["layerId"], rig["id"]]
        ids += [b["id"] for b in rig["bones"]]
        ids += [f["id"] for b in rig["bones"] for f in b.get("keyframes", [])]
        ids += [a["id"] for a in rig["attachments"]]
        if len(set(ids)) != len(ids) or any(
            _unique_entity(result, value) is not None for value in ids
        ):
            raise CommandError(422, "ENTITY_ID_USED", "Imported IDs must be globally unused")
        box = svg["viewBox"]
        asset = {
            "id": args["assetId"],
            "name": args["name"],
            "kind": "svg",
            "uri": "assets/fixtures/placeholder.svg",
            "sourceUri": "assets/fixtures/placeholder.svg",
            "rights": args["rights"],
        }
        result["assets"].append(asset)
        result["layers"].append(
            {
                "id": args["layerId"],
                "shotId": target,
                "name": args["name"],
                "kind": "character_sprite",
                "assetId": args["assetId"],
                "characterId": args["characterId"],
                "pose": None,
                "rig": rig,
                "transform": {
                    "x": 0,
                    "y": 0,
                    "z": 0,
                    "rotationDeg": 0,
                    "scale": min(1, 200 / max(box["width"], box["height"])),
                },
            }
        )
        shot["layerIds"].append(args["layerId"])
        ensure_valid_document(result)
        imported = asset_store.import_svg(args["svg"])
        asset.update(uri=imported["uri"], sourceUri=imported["sourceUri"])
        changed.extend(ids)
    else:
        matches = [
            (layer, bone)
            for layer in result["layers"]
            if layer.get("rig")
            for bone in layer["rig"]["bones"]
            if bone["id"] == target
        ]
        if len(matches) != 1:
            raise CommandError(404, "TARGET_NOT_FOUND", "Rig bone not found")
        _unique_entity(result, target)
        layer, bone = matches[0]
        if op == "setRigBonePose":
            if bone["rotationDeg"] == args["rotationDeg"] and bone["action"] == args["action"]:
                raise CommandError(422, "NO_CHANGE", "Bone pose is unchanged")
            bone.update(rotationDeg=args["rotationDeg"], action=args["action"])
        else:
            frames = bone.setdefault("keyframes", [])
            frame_id = args["keyframeId"]
            old = next((f for f in frames if f["id"] == frame_id), None)
            existing = _unique_entity(result, frame_id)
            changed.append(frame_id)
            if op == "deleteRigBoneKeyframe":
                if old is None:
                    raise CommandError(404, "KEYFRAME_NOT_FOUND", "Keyframe not found")
                frames.remove(old)
                if not frames:
                    del bone["keyframes"]
            else:
                if old is None and existing is not None:
                    raise CommandError(422, "ENTITY_ID_USED", "Keyframe ID must be globally unused")
                shot = next(s for s in result["shots"] if s["id"] == layer["shotId"])
                if args["timeMs"] > shot["durationMs"] or args["timeMs"] < 0:
                    raise CommandError(422, "INVALID_KEYFRAME_TIME", "Time exceeds shot duration")
                if any(f["timeMs"] == args["timeMs"] and f is not old for f in frames):
                    raise CommandError(422, "KEYFRAME_TIME_USED", "Keyframe time must be unique")
                frame = {
                    "id": frame_id,
                    "timeMs": args["timeMs"],
                    "rotationDeg": args["rotationDeg"],
                }
                if old == frame:
                    raise CommandError(422, "NO_CHANGE", "Keyframe is unchanged")
                if old is not None:
                    frames.remove(old)
                frames.append(frame)
                frames.sort(key=lambda f: (f["timeMs"], f["id"]))
    ensure_valid_document(result)
    changed = sorted(set(changed))
    forward = {
        "op": "restoreStageSnapshot",
        "targetId": target,
        "args": {"document": copy.deepcopy(result), "changedEntityIds": changed},
    }
    inverse = {
        "op": "restoreStageSnapshot",
        "targetId": target,
        "args": {"document": copy.deepcopy(document), "changedEntityIds": changed},
    }
    return result, forward, inverse, changed
