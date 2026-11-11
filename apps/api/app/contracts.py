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
SCHEMA_VERSION: str = SCHEMA["properties"]["schemaVersion"]["const"]


def _non_finite_issues(value: object, path: str = "") -> list[dict[str, str]]:
    # Python's decoder permits NaN/Infinity and overflows 1e400 to infinity;
    # JSON and AJV require finite numbers. Do not rewrite them as null.
    if isinstance(value, float) and not math.isfinite(value):
        return [{"path": path or "/", "message": "Number must be finite"}]
    if isinstance(value, dict):
        return [
            issue
            for key, child in value.items()
            for issue in _non_finite_issues(
                child, path + "/" + str(key).replace("~", "~0").replace("/", "~1")
            )
        ]
    if isinstance(value, list):
        return [
            issue
            for index, child in enumerate(value)
            for issue in _non_finite_issues(child, f"{path}/{index}")
        ]
    return []


def validate_document(document: object) -> list[dict[str, str]]:
    """Structural validation only; never coerce, repair, or mutate canon."""
    return _non_finite_issues(document) + [
        {
            "path": "/" + "/".join(
                str(part).replace("~", "~0").replace("/", "~1") for part in error.absolute_path
            ),
            "message": error.message,
        }
        for error in VALIDATOR.iter_errors(document)
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
