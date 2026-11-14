"""Read-only, revision-bound portable player media boundary; never fetch remote URIs."""

import base64
import binascii
import copy
import hashlib
import json
import math
import re
from pathlib import Path
from typing import Any, cast

from jsonschema import Draft202012Validator

from app.asset_evidence import inspect_asset, read_bound_svg
from app.asset_rights import USES, evaluate_asset_use, svg_payload_hash
from app.audio_assets import MAX_BYTES as MAX_AUDIO_BYTES
from app.audio_assets import _validate_wav, read_audio
from app.commands import CommandError
from app.contracts import SCHEMA_ROOT, validate_document
from app.svg_assets import SvgAssetError, SvgAssetStore, SvgData, _serialize, parse_svg

MAX_BYTES = 32 * 1024 * 1024
SCHEMA = json.loads((SCHEMA_ROOT / "player-manifest.schema.json").read_text(encoding="utf-8"))
VALIDATOR = Draft202012Validator(SCHEMA)


def _invalid(message: str, **details: Any) -> CommandError:
    return CommandError(422, "INVALID_PLAYER_MANIFEST", message, **details)


def _bounds(value: object) -> None:
    pending = [(value, 0)]
    seen: set[int] = set()
    count = size = 0
    while pending:
        item, depth = pending.pop()
        count += 1
        if count > 200000 or depth > 32:
            raise _invalid("Manifest exceeds 200000 nodes or depth 32.")
        if isinstance(item, str):
            size += len(item.encode("utf-8", errors="strict")) + 2
        elif isinstance(item, (int, float)) and not isinstance(item, bool):
            try:
                if not math.isfinite(item):
                    raise _invalid("Manifest numbers must be finite.")
            except OverflowError as error:
                raise _invalid("Manifest numbers must be finite in JavaScript.") from error
            # Conservatively reserve 32 bytes per numeric value for JS serialization.
            size += max(32, len(str(item)))
        elif isinstance(item, (dict, list)):
            if id(item) in seen:
                raise _invalid("Manifest must be a JSON tree.")
            seen.add(id(item))
            if isinstance(item, dict):
                for key, child in item.items():
                    if not isinstance(key, str):
                        raise _invalid("Manifest keys must be text.")
                    size += len(key.encode("utf-8", errors="strict")) + 4
                    pending.append((child, depth + 1))
            else:
                pending.extend((child, depth + 1) for child in item)
        elif item is not None and not isinstance(item, bool):
            raise _invalid("Manifest contains a non-JSON value.")
        if size > MAX_BYTES:
            raise _invalid("Manifest exceeds 32 MiB.")
    if (
        len(
            json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode(
                "utf-8"
            )
        )
        > MAX_BYTES
    ):
        raise _invalid("Manifest exceeds 32 MiB.")


def decode_manifest_audio(value: str) -> bytes:
    if not isinstance(value, str) or len(value) > ((MAX_AUDIO_BYTES + 2) // 3) * 4:
        raise _invalid("Audio exceeds 8 MiB.")
    try:
        raw = base64.b64decode(value, validate=True)
    except (binascii.Error, ValueError) as error:
        raise _invalid("Audio requires strict canonical base64.") from error
    if base64.b64encode(raw).decode("ascii") != value or len(raw) > MAX_AUDIO_BYTES:
        raise _invalid("Audio requires strict canonical bounded base64.")
    _validate_wav(raw)
    return raw


def referenced_assets(document: dict[str, Any]) -> set[str]:
    """Validate unique identity and bidirectional membership before reading any media."""
    ids: set[str] = set()
    pending: list[Any] = [document]
    while pending:
        value = pending.pop()
        if isinstance(value, dict):
            if isinstance(value.get("id"), str):
                if value["id"] in ids:
                    raise _invalid("Document IDs must be globally unique.")
                ids.add(value["id"])
            pending.extend(value.values())
        elif isinstance(value, list):
            pending.extend(value)
    collections = {
        name: {item["id"]: item for item in document[name]}
        for name in (
            "branches",
            "scenes",
            "events",
            "shots",
            "layers",
            "assets",
            "characters",
            "audioTracks",
        )
    }

    def exists(collection: str, identity: str | None) -> bool:
        return identity is None or identity in collections[collection]

    def member(collection: str, owner_id: str, owner_key: str, identity: str) -> bool:
        owner = collections[collection].get(owner_id)
        return owner is not None and owner[owner_key].count(identity) == 1

    if not exists("branches", document["project"]["activeBranchId"]):
        raise _invalid("Active branch is missing.")
    for branch in document["branches"]:
        if not exists("branches", branch["parentId"]):
            raise _invalid("Branch parent is missing.")
    for scene in document["scenes"]:
        for key, collection in (("shotIds", "shots"), ("eventIds", "events")):
            if len(set(scene[key])) != len(scene[key]) or any(
                not exists(collection, identity)
                or collections[collection][identity]["sceneId"] != scene["id"]
                for identity in scene[key]
            ):
                raise _invalid("Scene membership is invalid.")
    for event in document["events"]:
        if not member("scenes", event["sceneId"], "eventIds", event["id"]):
            raise _invalid("Event membership is invalid.")
    for shot in document["shots"]:
        if not member("scenes", shot["sceneId"], "shotIds", shot["id"]):
            raise _invalid("Shot membership is invalid.")
        for key, collection in (("layerIds", "layers"), ("audioTrackIds", "audioTracks")):
            if len(set(shot[key])) != len(shot[key]) or any(
                not exists(collection, identity)
                or collections[collection][identity]["shotId"] != shot["id"]
                for identity in shot[key]
            ):
                raise _invalid("Shot layer/track membership is invalid.")
        for override in shot["layoutOverrides"].values():
            if any(identity not in shot["layerIds"] for identity in override["layerTransforms"]):
                raise _invalid("Layout override membership is invalid.")
    used: set[str] = set()
    for layer in document["layers"]:
        if not member("shots", layer["shotId"], "layerIds", layer["id"]) or not exists(
            "characters", layer["characterId"]
        ):
            raise _invalid("Layer references are invalid.")
        if layer["kind"] not in {"svg_plane", "character_sprite"}:
            raise _invalid("Only SVG planes and character sprites are supported by this player.")
        metadata = collections["assets"].get(layer["assetId"])
        if metadata is None or metadata["kind"] != "svg":
            raise _invalid("Layer SVG asset is missing.")
        used.add(layer["assetId"])
        if any(
            frame["timeMs"] > collections["shots"][layer["shotId"]]["durationMs"]
            for frame in layer.get("keyframes", [])
        ):
            raise _invalid("Keyframe exceeds shot duration.")
    for track in document["audioTracks"]:
        metadata = collections["assets"].get(track["assetId"])
        bound = collections["layers"].get(track["boundLayerId"])
        if (
            not member("shots", track["shotId"], "audioTrackIds", track["id"])
            or metadata is None
            or metadata["kind"] != "audio"
            or (
                track["boundLayerId"] is not None
                and (bound is None or bound["shotId"] != track["shotId"])
            )
        ):
            raise _invalid("Audio track references are invalid.")
        used.add(track["assetId"])
    for character in document["characters"]:
        for constraint in character["constraints"]:
            if not exists("events", constraint["effectiveFromEventId"]) or not exists(
                "events", constraint["resolvedByEventId"]
            ):
                raise _invalid("Constraint event is missing.")
    for binding in document["bindings"]:
        if binding["source"]["entityId"] not in ids or binding["target"]["entityId"] not in ids:
            raise _invalid("Binding reference is missing.")
    return used


def validate_player_manifest(value: object) -> list[dict[str, str]]:
    try:
        _bounds(value)
        if not VALIDATOR.is_valid(value):
            raise _invalid("Invalid player manifest structure.")
        manifest = cast(dict[str, Any], value)
        document = manifest["document"]
        issues = validate_document(document)
        if issues:
            return issues
        used = referenced_assets(document)
        metadata = {asset["id"]: asset for asset in document["assets"]}
        entries: set[str] = set()
        evidence = manifest.get("evidence", [])
        export_use = manifest.get("exportUse", "private_preview")
        hashes: set[str] = set()
        required: set[str] = set()
        raw_bindings: dict[str, str] = {}
        payload_bindings: dict[str, str] = {}
        for blob in evidence:
            raw = blob["text"].encode("utf-8")
            if (blob["sha256"] in hashes or len(raw) > 65536
                    or blob["uri"] != f"assets/evidence/{blob['sha256']}.txt"
                    or hashlib.sha256(raw).hexdigest() != blob["sha256"]):
                raise _invalid("Evidence integrity or uniqueness check failed.")
            hashes.add(blob["sha256"])
        for entry in manifest["assets"]:
            asset = metadata.get(entry["assetId"])
            if (
                entry["assetId"] not in used
                or entry["assetId"] in entries
                or asset is None
                or asset["kind"] != entry["kind"]
                or asset["rights"] == "unknown"
            ):
                raise _invalid(
                    "Manifest media must exactly match referenced assets with known rights."
                )
            entries.add(entry["assetId"])
            provenance = asset.get("provenance")
            refs = {ref["sha256"] for ref in (provenance or {}).get("evidence", [])}
            required.update(refs)
            decision = evaluate_asset_use(asset, export_use,
                                          [blob for blob in evidence if blob["sha256"] in refs])
            if not decision["allowed"]:
                raise _invalid(f"Asset {asset['id']}: " + "; ".join(decision["reasons"]))
            if provenance:
                for binding in (provenance["original"], provenance["current"]):
                    uri, digest = binding["uri"], binding["sha256"]
                    named_digest = re.fullmatch(
                        r"assets/(?:originals|imported)/([a-f0-9]{64})\.(?:svg|wav)", uri
                    )
                    if ((uri in raw_bindings and raw_bindings[uri] != digest)
                            or (named_digest and named_digest[1] != digest)):
                        raise _invalid(f"Asset {asset['id']}: immutable URI/raw hash mismatch.")
                    raw_bindings[uri] = digest
                current = provenance["current"]
                if (current["uri"] in payload_bindings
                        and payload_bindings[current["uri"]] != current["payloadSha256"]):
                    raise _invalid(
                        f"Asset {asset['id']}: shared current URI/payload hash mismatch."
                    )
                payload_bindings[current["uri"]] = current["payloadSha256"]
            if entry["kind"] == "svg":
                svg = entry["svg"]
                if (
                    svg["assetId"] != asset["id"]
                    or svg["uri"] != asset["uri"]
                    or svg["sourceUri"] != asset.get("sourceUri", asset["uri"])
                ):
                    raise _invalid("SVG identity does not match saved metadata.")
                data: SvgData = {"viewBox": svg["viewBox"], "root": svg["root"]}
                # The existing sanitizer discards insignificant text whitespace outside
                # text elements. Match the client validator while rejecting lost fields.
                normalized = copy.deepcopy(data)
                nodes = [normalized["root"]]
                while nodes:
                    node = nodes.pop()
                    if node["tag"] != "text" and not node["text"].strip():
                        node["text"] = ""
                    nodes.extend(node["children"])
                if parse_svg(_serialize(data).decode("utf-8")) != normalized:
                    raise _invalid("SVG must be the sanitized tree without dropped fields.")
                payload_hash = svg_payload_hash(svg)
            else:
                payload_hash = hashlib.sha256(
                    decode_manifest_audio(entry["dataBase64"])
                ).hexdigest()
            if provenance and (payload_hash != provenance["current"]["payloadSha256"] or (
                    entry["kind"] == "audio" and payload_hash != provenance["current"]["sha256"])):
                raise _invalid(f"Asset {asset['id']}: media payload integrity check failed.")
        if entries != used:
            raise _invalid("Referenced media is missing from the manifest.")
        if hashes != required:
            raise _invalid("Evidence must exactly cover the included media.")
        return []
    except (
        CommandError,
        SvgAssetError,
        ValueError,
        UnicodeError,
        OverflowError,
        RecursionError,
    ) as error:
        return [{"path": "/", "message": str(error)}]


def build_player_manifest(
    document: dict[str, Any],
    asset_root: Path,
    asset_store: SvgAssetStore,
    export_use: str = "private_preview",
) -> dict[str, Any]:
    """Consume exactly one detached snapshot, without canonical or export-job writes."""
    context_id: str | None = None
    try:
        if export_use not in USES:
            raise _invalid("Unknown export use.")
        _bounds(document)
        snapshot = copy.deepcopy(document)
        if validate_document(snapshot):
            raise _invalid("Saved document violates its canonical schema.")
        used = referenced_assets(snapshot)
        if len(used) > 64:
            raise _invalid("At most 64 embedded media assets are supported.")
        assets: list[dict[str, Any]] = []
        evidence: dict[str, dict[str, str]] = {}
        # Stop assembly as soon as the cumulative portable bytes cannot fit. Do
        # not materialize all 64 potential 8 MiB clips before rejecting the bundle.
        size = (
            len(json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
            + 128
        )
        for asset in snapshot["assets"]:
            if asset["id"] not in used:
                continue
            context_id = asset["id"]
            observations = (
                inspect_asset(asset, asset_root, asset_store) if "provenance" in asset else None
            )
            blobs = observations["evidence"] if observations else []
            if observations and observations["error"]:
                raise _invalid(observations["error"])
            decision = evaluate_asset_use(asset, export_use, blobs)
            if not decision["allowed"]:
                raise _invalid(f"Asset {asset['id']}: " + "; ".join(decision["reasons"]),
                               decisions=[decision])
            for blob in blobs:
                if blob["sha256"] not in evidence:
                    evidence[blob["sha256"]] = blob
                    size += len(json.dumps(blob, ensure_ascii=False).encode("utf-8")) + 1
            if asset["kind"] == "svg":
                svg = {
                    "assetId": asset["id"],
                    "uri": asset["uri"],
                    "sourceUri": asset.get("sourceUri", asset["uri"]),
                    **(read_bound_svg(asset, asset_root) if "provenance" in asset
                       else asset_store.read_svg(asset["uri"])),
                }
                entry = {"assetId": asset["id"], "kind": "svg", "svg": svg}
            elif asset["kind"] == "audio":
                raw = read_audio(asset_root, asset["uri"])
                entry = {
                    "assetId": asset["id"],
                    "kind": "audio",
                    "mimeType": "audio/wav",
                    "dataBase64": base64.b64encode(raw).decode("ascii"),
                }
            else:
                raise _invalid("Referenced media type is unsupported.")
            size += (
                len(json.dumps(entry, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
                + 1
            )
            if size > MAX_BYTES:
                raise _invalid("Manifest exceeds 32 MiB; reduce referenced media size.")
            assets.append(entry)
        context_id = None
        manifest = {"manifestVersion": "1.0.0", "document": snapshot, "assets": assets}
        if export_use != "private_preview" or any(
            "provenance" in asset for asset in snapshot["assets"]
        ):
            manifest.update(manifestVersion="1.1.0", exportUse=export_use,
                            evidence=list(evidence.values()))
        issues = validate_player_manifest(manifest)
        if issues:
            raise _invalid(issues[0]["message"])
        return manifest
    except (CommandError, SvgAssetError, UnicodeError, ValueError, RecursionError) as error:
        details = {key: value for key, value in error.detail.items()
                   if key not in {"code", "message"}} if isinstance(error, CommandError) else {}
        if context_id is not None:
            details.setdefault("assetIds", [context_id])
        details["exportUse"] = export_use
        raise _invalid(f"Cannot prepare portable player media: {error}", **details) from error
