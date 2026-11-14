"""Pure, version-bound recorded-rights policy; no media or evidence file I/O."""

import hashlib
import json
import math
import re
import struct
from pathlib import Path
from typing import Any, cast

from jsonschema import Draft202012Validator

_ROOT = Path(__file__).resolve().parents[3] / "packages" / "schema"
_SCHEMA = json.loads((_ROOT / "asset-provenance.schema.json").read_text(encoding="utf-8"))
_VALIDATOR = Draft202012Validator(_SCHEMA)
_COMMAND = json.loads((_ROOT / "command.schema.json").read_text(encoding="utf-8"))
_ARGS = Draft202012Validator(_COMMAND["$defs"]["assetEvidenceArgs"])
USES = ("private_preview", "public_distribution", "commercial_pack")
_WHITESPACE = "".join(
    chr(cp)
    for cp in [
        *range(9, 14),
        32,
        133,
        160,
        5760,
        *range(8192, 8203),
        8232,
        8233,
        8239,
        8287,
        12288,
        65279,
    ]
)


def _trim(text: str) -> str:
    return text.strip(_WHITESPACE)


def portable_json_within(value: object, max_bytes: int) -> bool:
    """Reject cycles, non-scalar text and oversized/deep input before recursion."""
    active: set[int] = set()
    stack: list[tuple[object, int, bool]] = [(value, 0, False)]
    nodes = text_bytes = 0
    while stack:
        child, depth, exiting = stack.pop()
        if exiting:
            active.remove(id(child))
            continue
        nodes += 1
        if nodes > 200000 or depth > 32:
            return False
        if isinstance(child, str):
            try:
                text_bytes += len(child.encode("utf-8"))
            except UnicodeEncodeError:
                return False
        elif type(child) in (int, float):
            try:
                if not math.isfinite(cast(int | float, child)):
                    return False
            except OverflowError:
                return False
        elif isinstance(child, (dict, list)):
            if id(child) in active:
                return False
            active.add(id(child))
            stack.append((child, depth, True))
            if isinstance(child, dict):
                for key, item in child.items():
                    if not isinstance(key, str):
                        return False
                    try:
                        text_bytes += len(key.encode("utf-8"))
                    except UnicodeEncodeError:
                        return False
                    stack.append((item, depth + 1, False))
            else:
                stack.extend((item, depth + 1, False) for item in child)
        elif child is not None and type(child) is not bool:
            return False
        if text_bytes > max_bytes:
            return False
    try:
        return (
            len(
                json.dumps(
                    value, ensure_ascii=False, separators=(",", ":"), allow_nan=False
                ).encode("utf-8")
            )
            <= max_bytes
        )
    except (ValueError, TypeError, OverflowError):
        return False


def _safe_media_uri(uri: str) -> bool:
    return bool(re.fullmatch(r"assets/[A-Za-z0-9_./-]+", uri)) and all(
        part not in ("", ".", "..") for part in uri.split("/")
    )


def _issue(message: str) -> list[dict[str, str]]:
    return [{"path": "/", "message": message}]


def validate_asset_provenance(value: object) -> list[dict[str, str]]:
    if not portable_json_within(value, 128 * 1024):
        return _issue("Provenance must be bounded portable JSON")
    if not _VALIDATOR.is_valid(value):
        return _issue("Malformed asset provenance")
    value = cast(dict[str, Any], value)
    if not _safe_media_uri(value["original"]["uri"]) or not _safe_media_uri(
        value["current"]["uri"]
    ):
        return _issue("Unsafe media URI")
    hashes: set[str] = set()
    for ref in value["evidence"]:
        if ref["uri"] != f"assets/evidence/{ref['sha256']}.txt" or ref["sha256"] in hashes:
            return _issue("Duplicate or mismatched evidence reference")
        hashes.add(ref["sha256"])
    return []


def validate_evidence_args(value: object) -> list[dict[str, str]]:
    if not portable_json_within(value, 512 * 1024) or not _ARGS.is_valid(value):
        return _issue("Invalid or oversized evidence")
    value = cast(dict[str, Any], value)
    if not _safe_media_uri(value["expectedAssetUri"]) or not _safe_media_uri(
        value["expectedSourceUri"]
    ):
        return _issue("Unsafe media URI")
    total = 0
    hashes = set()
    for ref in value["evidence"]:
        data = ref["text"].encode("utf-8")
        total += len(data)
        digest = hashlib.sha256(data).hexdigest()
        if len(data) > 65536 or total > 262144 or digest in hashes:
            return _issue("Invalid or oversized evidence")
        hashes.add(digest)
    return []


def svg_payload_hash(svg: dict[str, Any]) -> str:
    """Big-endian IEEE754 viewBox, normalized signed zero and fixed-order JSON nodes."""
    if not portable_json_within(svg, 4 * 1024 * 1024):
        raise ValueError("SVG payload must be bounded portable JSON")

    def number(value: float) -> str:
        if not math.isfinite(value):
            raise ValueError("SVG viewBox must be finite")
        # JSON.stringify loses a zero's sign; only raw media hashes retain byte identity.
        return struct.pack(">d", 0.0 if value == 0 else value).hex()

    def node(value: dict[str, Any]) -> dict[str, Any]:
        return {
            "tag": value["tag"],
            "id": value["id"],
            "attributes": [[key, value["attributes"][key]] for key in sorted(value["attributes"])],
            "text": value["text"],
            "children": [node(child) for child in value["children"]],
        }

    payload = {
        "viewBox": [number(svg["viewBox"][key]) for key in ("x", "y", "width", "height")],
        "root": node(svg["root"]),
    }
    data = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def evaluate_asset_use(asset: dict[str, Any], use: str, evidence: object = None) -> dict[str, Any]:
    reasons: list[str] = []
    attribution: list[str] = []
    decision = {
        "assetId": asset["id"],
        "use": use,
        "allowed": False,
        "reasons": reasons,
        "attribution": attribution,
    }

    def result() -> dict[str, Any]:
        decision["allowed"] = not reasons
        return decision

    if use not in USES:
        reasons.append("Unknown export use")
    if asset.get("rights") not in ("project_original", "licensed", "ai_generated"):
        reasons.append("Asset rights are unknown")
    if "provenance" not in asset:
        if use != "private_preview":
            reasons.append("Record explicit permission and evidence for this use")
        return result()
    p = asset["provenance"]
    if validate_asset_provenance(p):
        reasons.append("Asset provenance is malformed or exceeds limits")
        return result()
    if p["current"]["uri"] != asset["uri"] or p["original"]["uri"] != asset.get(
        "sourceUri", asset["uri"]
    ):
        reasons.append("Media version binding is stale")
    if p["permissions"].get(use) != "allowed":
        reasons.append("Recorded permission does not allow this use")
    evidence = [] if evidence is None else evidence
    verified: set[str] = set()
    if (
        not portable_json_within(evidence, 512 * 1024)
        or not isinstance(evidence, list)
        or len(evidence) > 8
    ):
        reasons.append("Evidence is malformed or exceeds limits")
    else:
        total = 0
        seen: set[str] = set()
        for blob in evidence:
            if (
                not isinstance(blob, dict)
                or set(blob) != {"uri", "sha256", "text"}
                or any(not isinstance(blob[key], str) for key in blob)
            ):
                reasons.append("Malformed evidence blob")
                continue
            data = blob["text"].encode("utf-8")
            total += len(data)
            if (
                len(data) > 65536
                or total > 262144
                or not _trim(blob["text"])
                or blob["uri"] != f"assets/evidence/{blob['sha256']}.txt"
                or not re.fullmatch("[a-f0-9]{64}", blob["sha256"])
                or blob["sha256"] in seen
                or hashlib.sha256(data).hexdigest() != blob["sha256"]
            ):
                reasons.append("Evidence integrity check failed")
            else:
                verified.add(blob["sha256"])
            seen.add(blob["sha256"])
    if any(ref["sha256"] not in verified for ref in p["evidence"]):
        reasons.append("Referenced evidence is missing or invalid")
    referenced = {ref["sha256"] for ref in p["evidence"]}
    if not p["evidence"]:
        reasons.append("This use requires recorded evidence")
    if use != "private_preview":
        if any(
            not _trim(p[key]) or _trim(p[key]).lower() == "unknown"
            for key in ("creator", "source", "license")
        ):
            reasons.append("Record creator, source and license")
    for consent in p["consents"]:
        if use != "private_preview" and consent["applicability"] == "unknown":
            reasons.append(consent["kind"] + " consent applicability is unknown")
        if consent["applicability"] == "required" and (
            not _trim(consent["subject"])
            or _trim(consent["subject"]).lower() == "unknown"
            or consent["status"] != "allowed"
            or use not in consent["uses"]
            or not consent["evidenceHashes"]
            or any(
                digest not in referenced or digest not in verified
                for digest in consent["evidenceHashes"]
            )
        ):
            reasons.append(consent["kind"] + " consent does not cover this use")
    if _trim(p["attribution"]):
        attribution.append(p["attribution"])
    return result()
