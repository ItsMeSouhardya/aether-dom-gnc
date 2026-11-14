"""Reviewed human metadata corrections with exact predecessor and successor snapshots."""

import copy
from typing import Any

from app.asset_evidence import EvidenceStore, invalid, observe_media
from app.asset_rights import validate_asset_provenance, validate_evidence_args
from app.commands import CommandError, _unique_entity, ensure_valid_document
from app.svg_assets import SvgAssetError, SvgAssetStore


def apply_asset_operation(
    document: dict[str, Any],
    operation: dict[str, Any],
    store: SvgAssetStore | None,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], list[str]]:
    if store is None:
        raise invalid("Contained media storage is required")
    target, args = operation["targetId"], operation["args"]
    _unique_entity(document, target)
    asset = next((item for item in document["assets"] if item["id"] == target), None)
    if asset is None:
        raise CommandError(404, "ASSET_NOT_FOUND", "The target asset does not exist")
    if validate_evidence_args(args):
        raise invalid("Invalid or oversized evidence arguments")
    if args["expectedAssetUri"] != asset["uri"] or args["expectedSourceUri"] != asset.get(
        "sourceUri", asset["uri"]
    ):
        raise CommandError(
            409, "ASSET_VERSION_CONFLICT", "Reload the captured asset version", assetId=target
        )
    try:
        original, current = observe_media(asset, store.root)
    except (CommandError, SvgAssetError, UnicodeError, ValueError) as error:
        # Never expose raw malformed bytes or turn a pre-write validation failure
        # into an uncertain-outcome 500. No evidence or canonical writes have run.
        raise CommandError(
            422,
            "INVALID_ASSET_EVIDENCE",
            f"Asset {target}: media cannot be inspected; restore a supported version",
            assetId=target,
        ) from error
    old = asset.get("provenance")
    if old and (
        old["original"] != original
        or (old["current"]["uri"] == current["uri"] and old["current"] != current)
    ):
        raise invalid(f"Asset {target}: immutable media changed; restore the reviewed bytes")
    evidence_store = EvidenceStore(store.root)
    blobs = [evidence_store.blob(ref["text"]) for ref in args["evidence"]]
    lineage = copy.deepcopy(args["lineage"])
    if old and old["current"]["uri"] != current["uri"]:
        lineage = (
            lineage or copy.deepcopy(old["lineage"]) or {"provider": "local", "model": "svg-edit"}
        )
        lineage["parentSha256"] = old["current"]["sha256"]
    provenance = {
        "ledgerVersion": "1.0.0",
        "original": original,
        "current": current,
        **{
            key: copy.deepcopy(args[key])
            for key in ("creator", "source", "license", "attribution", "permissions", "consents")
        },
        "lineage": lineage,
        "evidence": [
            {"uri": blob["uri"], "sha256": blob["sha256"], "label": ref["label"]}
            for blob, ref in zip(blobs, args["evidence"], strict=True)
        ],
    }
    if validate_asset_provenance(provenance):
        raise invalid("Authored provenance exceeds the portable ledger contract")
    if old == provenance and asset["rights"] == args["rights"]:
        raise CommandError(422, "NO_CHANGE", "The reviewed asset evidence is unchanged")
    result = copy.deepcopy(document)
    updated = next(item for item in result["assets"] if item["id"] == target)
    updated.update(rights=args["rights"], provenance=provenance)
    result["schemaVersion"] = "0.4.0"
    ensure_valid_document(result)
    for blob in blobs:
        evidence_store.write(blob["text"])
    changed = [target]

    def snapshot(value: dict[str, Any]) -> dict[str, Any]:
        return {
            "op": "restoreStageSnapshot",
            "targetId": target,
            "args": {"document": copy.deepcopy(value), "changedEntityIds": changed},
        }

    return result, snapshot(result), snapshot(document), changed
