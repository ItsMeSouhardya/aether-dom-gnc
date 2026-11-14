"""Validate portable documents against the shared canonical JSON Schema."""

import json
import math
from pathlib import Path
from typing import Any, cast

from jsonschema import Draft202012Validator

SCHEMA_ROOT = Path(__file__).resolve().parents[3] / "packages" / "schema"
SCHEMA = json.loads((SCHEMA_ROOT / "cdom.schema.json").read_text(encoding="utf-8"))
Draft202012Validator.check_schema(SCHEMA)
VALIDATOR = Draft202012Validator(SCHEMA)
SCHEMA_V2 = json.loads((SCHEMA_ROOT / "cdom.v0.2.schema.json").read_text(encoding="utf-8"))
Draft202012Validator.check_schema(SCHEMA_V2)
VALIDATOR_V2 = Draft202012Validator(SCHEMA_V2)
SCHEMA_V3 = json.loads((SCHEMA_ROOT / "cdom.v0.3.schema.json").read_text(encoding="utf-8"))
Draft202012Validator.check_schema(SCHEMA_V3)
VALIDATOR_V3 = Draft202012Validator(SCHEMA_V3)
SCHEMA_V4 = json.loads((SCHEMA_ROOT / "cdom.v0.4.schema.json").read_text(encoding="utf-8"))
Draft202012Validator.check_schema(SCHEMA_V4)
VALIDATOR_V4 = Draft202012Validator(SCHEMA_V4)
SCHEMA_VERSION = "0.4.0"
SUPPORTED_SCHEMA_VERSIONS = ["0.1.0", "0.2.0", "0.3.0", "0.4.0"]


def _portable_issues(value: object, path: str = "") -> list[dict[str, str]]:
    # Python permits NaN/Infinity and arbitrary-size integers. Both must stay
    # finite when decoded as JavaScript numbers; never repair them as null.
    if isinstance(value, str) and any(0xD800 <= ord(char) <= 0xDFFF for char in value):
        return [{"path": path or "/", "message": "Text must contain Unicode scalar values"}]
    if isinstance(value, (int, float)):
        try:
            finite = math.isfinite(value)
        except OverflowError:
            finite = False
        if not finite:
            return [{"path": path or "/", "message": "Number must be finite"}]
    if isinstance(value, dict):
        issues = []
        for key, child in value.items():
            location = path + "/" + str(key).replace("~", "~0").replace("/", "~1")
            issues.extend(_portable_issues(str(key), location))
            issues.extend(_portable_issues(child, location))
        return issues
    if isinstance(value, list):
        return [
            issue
            for index, child in enumerate(value)
            for issue in _portable_issues(child, f"{path}/{index}")
        ]
    return []


def validate_document(document: object) -> list[dict[str, str]]:
    """Structural validation only; never coerce, repair, or mutate canon."""
    version = document.get("schemaVersion") if isinstance(document, dict) else None
    if (
        version == "0.4.0"
        and isinstance(document, dict)
        and isinstance(document.get("assets"), list)
    ):
        from .asset_rights import validate_asset_provenance

        for asset in document["assets"]:
            if isinstance(asset, dict) and "provenance" in asset:
                issues = validate_asset_provenance(asset["provenance"])
                if issues:
                    return issues
    validator = (
        VALIDATOR_V4
        if version == "0.4.0"
        else VALIDATOR_V3
        if version == "0.3.0"
        else (VALIDATOR_V2 if version == "0.2.0" else VALIDATOR)
    )
    return _portable_issues(document) + [
        {
            "path": "/"
            + "/".join(
                str(part).replace("~", "~0").replace("/", "~1") for part in error.absolute_path
            ),
            "message": error.message,
        }
        for error in validator.iter_errors(document)
    ]


def load_fixture() -> dict[str, Any]:
    """Read fresh data so callers cannot mutate a shared canonical snapshot."""
    document = json.loads(
        (SCHEMA_ROOT / "fixtures" / "sample.cdom.json").read_text(encoding="utf-8")
    )
    issues = validate_document(document)
    if issues:
        raise ValueError(f"Bundled fixture violates the .cdom contract: {issues}")
    return cast(dict[str, Any], document)
