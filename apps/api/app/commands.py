"""Pure, schema-validated authored operations. UI and derived state never enter canon."""

import copy
import json
from typing import Any, cast

from jsonschema import Draft202012Validator

from app.contracts import SCHEMA_ROOT, _non_finite_issues, validate_document

COMMAND_SCHEMA = json.loads((SCHEMA_ROOT / "command.schema.json").read_text(encoding="utf-8"))
Draft202012Validator.check_schema(COMMAND_SCHEMA)
COMMAND_VALIDATOR = Draft202012Validator(COMMAND_SCHEMA)


class CommandError(Exception):
    def __init__(self, status: int, code: str, message: str, **details: Any) -> None:
        self.status = status
        self.detail = {"code": code, "message": message, **details}
        super().__init__(message)


def validate_command(value: object) -> dict[str, Any]:
    """Reject malformed/non-finite commands without coercing or repairing input."""
    if _non_finite_issues(value) or not COMMAND_VALIDATOR.is_valid(value):
        raise CommandError(422, "INVALID_COMMAND", "Command violates the shared command schema")
    return cast(dict[str, Any], value)


def apply_transform(
    document: dict[str, Any], operation: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    """Copy/apply a partial transform, returning exact full forward/inverse transforms."""
    result = copy.deepcopy(document)
    layer = next(
        (layer for layer in result["layers"] if layer["id"] == operation["targetId"]), None,
    )
    if layer is None:
        raise CommandError(404, "TARGET_NOT_FOUND", "The target layer does not exist")
    inverse = {"targetId": layer["id"], "args": copy.deepcopy(layer["transform"])}
    layer["transform"].update(operation["args"])
    forward = {"targetId": layer["id"], "args": copy.deepcopy(layer["transform"])}
    ensure_valid_document(result)
    return result, forward, inverse


def ensure_valid_document(document: dict[str, Any]) -> None:
    if validate_document(document):
        raise CommandError(
            422, "INVALID_DOCUMENT", "The resulting document violates the .cdom schema",
        )
