"""Bound strict raw JSON before recursive command/schema processing."""

import json
from typing import Any

from fastapi import Request

from app.asset_rights import portable_json_within
from app.commands import CommandError


def invalid() -> CommandError:
    return CommandError(422, "INVALID_COMMAND", "A bounded strict JSON command body is required")


def parse_command_body(raw: bytes) -> object:
    if len(raw) > 512 * 1024:
        raise invalid()
    try:
        text = raw.decode("utf-8", errors="strict")
        depth, quoted, escaped = 0, False, False
        for char in text:
            if quoted:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == '"':
                    quoted = False
            elif char == '"':
                quoted = True
            elif char in "[{":
                depth += 1
                if depth > 33:
                    raise invalid()
            elif char in "]}":
                depth -= 1

        def pairs(items: list[tuple[str, Any]]) -> dict[str, Any]:
            result: dict[str, Any] = {}
            for key, value in items:
                if key in result:
                    raise invalid()
                result[key] = value
            return result

        def constant(value: str) -> None:
            raise invalid()

        result = json.loads(text, object_pairs_hook=pairs, parse_constant=constant)
        if not portable_json_within(result, 512 * 1024):
            raise invalid()
        return result
    except (ValueError, UnicodeError, RecursionError) as error:
        raise invalid() from error


async def command_body(request: Request) -> object:
    if (
        request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
        != "application/json"
    ):
        raise invalid()
    raw = bytearray()
    async for chunk in request.stream():
        if len(raw) + len(chunk) > 512 * 1024:
            raise invalid()
        raw.extend(chunk)
    return parse_command_body(bytes(raw))
