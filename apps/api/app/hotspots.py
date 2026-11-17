"""Validation for shot-owned saved lore hotspots."""

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator


def validate_document_hotspots(document: dict[str, Any]) -> list[dict[str, str]]:
    ids: list[str] = []
    pending: list[Any] = [document]
    while pending:
        value = pending.pop()
        if isinstance(value, dict):
            if isinstance(value.get("id"), str):
                ids.append(value["id"])
            pending.extend(value.values())
        elif isinstance(value, list):
            pending.extend(value)
    hotspot_ids = [h["id"] for shot in document["shots"] for h in shot.get("hotspots", [])]
    if any(ids.count(identifier) != 1 for identifier in hotspot_ids):
        return [{"path": "/shots", "message": "Hotspot ID must be globally unique"}]
    return []


_HOTSPOT_VALIDATOR = Draft202012Validator(
    json.loads(
        (Path(__file__).resolve().parents[3] / "packages/schema/hotspot.schema.json").read_text(
            encoding="utf-8"
        )
    )
)


def validate_lore_hotspot(value: object) -> list[dict[str, str]]:
    from app.contracts import _portable_issues

    issues = _portable_issues(value)
    issues.extend(
        {"path": "/" + "/".join(str(p) for p in error.absolute_path), "message": error.message}
        for error in _HOTSPOT_VALIDATOR.iter_errors(value)
    )
    return issues
