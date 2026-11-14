"""Bounded rigid skeleton validation and deterministic SVG affine evaluation."""

import json
import math
import re
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

_SCHEMA = json.loads(
    (Path(__file__).resolve().parents[3] / "packages/schema/rig.schema.json").read_text(
        encoding="utf-8"
    )
)
_VALIDATOR = Draft202012Validator(_SCHEMA)


def validate_rig(value: object) -> list[dict[str, str]]:
    def bad(message: str) -> list[dict[str, str]]:
        return [{"path": "/", "message": message}]

    try:
        from .asset_rights import portable_json_within

        if not portable_json_within(value, 128 * 1024) or list(_VALIDATOR.iter_errors(value)):
            return bad("Invalid rig structure")
        assert isinstance(value, dict)
        bones = value["bones"]
        attachments = value["attachments"]
        entities = [
            value,
            *bones,
            *attachments,
            *[f for b in bones for f in b.get("keyframes", [])],
        ]
        ids = [e["id"] for e in entities]
        if len(set(ids)) != len(ids):
            return bad("Duplicate rig entity ID")
        if any(
            any(0xD800 <= ord(c) <= 0xDFFF for c in str(v))
            for e in entities
            for v in e.values()
            if isinstance(v, str)
        ):
            return bad("Invalid scalar text")
        by_id = {b["id"]: b for b in bones}
        if sum(b["parentId"] is None for b in bones) != 1:
            return bad("Invalid root count")
        frames = 0
        for bone in bones:
            seen = set()
            current = bone
            while current is not None:
                if current["id"] in seen:
                    return bad("Cyclic bone graph")
                seen.add(current["id"])
                parent = current["parentId"]
                if parent is not None and parent not in by_id:
                    return bad("Missing bone parent")
                current = by_id.get(parent)
            times = []
            for frame in bone.get("keyframes", []):
                frames += 1
                times.append(frame["timeMs"])
                if isinstance(frame["timeMs"], bool) or not math.isfinite(frame["rotationDeg"]):
                    return bad("Invalid frame")
            if len(times) != len(set(times)):
                return bad("Duplicate bone frame time")
            if not all(
                math.isfinite(bone["rest"][x]) for x in ("x", "y", "rotationDeg")
            ) or not math.isfinite(bone["rotationDeg"]):
                return bad("Invalid number")
        if frames > 128:
            return bad("Invalid frame count")
        slots = [a["elementId"] for a in attachments]
        if len(slots) != len(set(slots)) or any(a["boneId"] not in by_id for a in attachments):
            return bad("Invalid attachment")
        return []
    except (TypeError, ValueError, OverflowError, RecursionError):
        return bad("Invalid rig structure")


def validate_rig_bindings(rig: dict[str, Any], svg: dict[str, Any]) -> list[dict[str, str]]:
    invalid = [{"path": "/", "message": "Invalid rig or SVG binding"}]
    if validate_rig(rig) or not isinstance(svg, dict):
        return invalid
    root = svg.get("root")
    if not isinstance(root, dict):
        return invalid
    attributes = root.get("attributes")
    children = root.get("children")
    if (
        root.get("tag") != "svg"
        or not isinstance(attributes, dict)
        or "transform" in attributes
        or not isinstance(children, list)
    ):
        return invalid
    # IDs identify source elements globally, including descendants and non-g nodes.
    # Bound traversal before examining untrusted trees, as the TS SVG validator does.
    pending = [(root, 1)]
    ids: set[str] = set()
    count = 0
    while pending:
        node, depth = pending.pop()
        count += 1
        if count > 512 or depth > 16 or not isinstance(node, dict):
            return invalid
        node_id = node.get("id")
        descendants = node.get("children")
        if (
            not isinstance(node_id, str)
            or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_.:-]{0,127}", node_id)
            or node_id in ids
            or not isinstance(descendants, list)
            or len(descendants) > 512
        ):
            return invalid
        ids.add(node_id)
        pending.extend((child, depth + 1) for child in descendants)
    for slot in rig["attachments"]:
        if (
            len([n for n in children if n.get("id") == slot["elementId"] and n.get("tag") == "g"])
            != 1
        ):
            return invalid
    return []


def _mul(a: list[float], b: list[float]) -> list[float]:
    return [
        a[0] * b[0] + a[2] * b[1],
        a[1] * b[0] + a[3] * b[1],
        a[0] * b[2] + a[2] * b[3],
        a[1] * b[2] + a[3] * b[3],
        a[0] * b[4] + a[2] * b[5] + a[4],
        a[1] * b[4] + a[3] * b[5] + a[5],
    ]


def _local(x: float, y: float, deg: float) -> list[float]:
    r = math.radians(deg)
    c = math.cos(r)
    s = math.sin(r)
    return [c, s, -s, c, x, y]


def evaluate_rig(
    rig: dict[str, Any], time_ms: float, animate: bool = True
) -> dict[str, dict[str, list[float]]]:
    if validate_rig(rig) or not math.isfinite(time_ms):
        raise ValueError("Invalid rig or time")
    time = max(0, time_ms)
    posed: dict[str, list[float]] = {}
    rest: dict[str, list[float]] = {}
    remaining = list(rig["bones"])
    while remaining:
        index = next(
            i for i, b in enumerate(remaining) if b["parentId"] is None or b["parentId"] in posed
        )
        bone = remaining.pop(index)
        angle = bone["rotationDeg"]
        if animate:
            previous = {"timeMs": 0, "rotationDeg": angle}
            for frame in sorted(bone.get("keyframes", []), key=lambda f: f["timeMs"]):
                if frame["timeMs"] == 0:
                    previous = frame
                    continue
                if time < frame["timeMs"]:
                    angle = previous["rotationDeg"] + (
                        frame["rotationDeg"] - previous["rotationDeg"]
                    ) * (time - previous["timeMs"]) / (frame["timeMs"] - previous["timeMs"])
                    break
                previous = frame
            else:
                angle = previous["rotationDeg"]
        r = bone["rest"]
        base = _local(r["x"], r["y"], r["rotationDeg"])
        pose = _local(r["x"], r["y"], r["rotationDeg"] + angle)
        parent = bone["parentId"]
        rest[bone["id"]] = _mul(rest[parent], base) if parent else base
        posed[bone["id"]] = _mul(posed[parent], pose) if parent else pose
    slots = {}
    for slot in rig["attachments"]:
        m = rest[slot["boneId"]]
        inverse = [m[0], m[2], m[1], m[3], -m[0] * m[4] - m[1] * m[5], -m[2] * m[4] - m[3] * m[5]]
        slots[slot["id"]] = _mul(posed[slot["boneId"]], inverse)
    return {"boneMatrices": posed, "attachmentMatrices": slots}


def validate_document_rigs(document: dict[str, Any]) -> list[dict[str, str]]:
    ids: set[str] = set()

    def visit(value: Any) -> bool:
        if isinstance(value, list):
            return all(visit(v) for v in value)
        if isinstance(value, dict):
            for key, child in value.items():
                if key == "id" and isinstance(child, str):
                    if child in ids:
                        return False
                    ids.add(child)
                elif not visit(child):
                    return False
        return True

    def bad(message: str) -> list[dict[str, str]]:
        return [{"path": "/layers", "message": message}]

    if not visit(document):
        return bad("Duplicate canonical entity ID")
    for layer in document["layers"]:
        rig = layer.get("rig")
        if rig is None:
            continue
        issues = validate_rig(rig)
        if issues:
            return issues
        shots = [s for s in document["shots"] if layer["id"] in s["layerIds"]]
        if (
            layer["kind"] != "character_sprite"
            or not layer["characterId"]
            or not any(c["id"] == layer["characterId"] for c in document["characters"])
            or not any(
                a["id"] == layer["assetId"] and a["kind"] == "svg" for a in document["assets"]
            )
            or len(shots) != 1
            or shots[0]["id"] != layer["shotId"]
        ):
            return bad("Invalid rig ownership")
        if any(
            f["timeMs"] > shots[0]["durationMs"]
            for b in rig["bones"]
            for f in b.get("keyframes", [])
        ):
            return bad("Rig frame exceeds shot duration")
    return []
