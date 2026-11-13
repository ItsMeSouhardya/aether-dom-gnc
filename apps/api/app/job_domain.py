"""Strict bounded job contracts and immutable artifact hashing."""

import copy
import hashlib
import json
import re
from datetime import UTC, datetime
from typing import Any, cast

from app.commands import CommandError
from app.proposal_domain import _bounded, _json, _validator, validate_proposal_request

JOB_VALIDATOR = _validator("job")
REQUEST_VALIDATOR = _validator("job-request")
ZERO_COST = {"amount": 0, "currency": "USD"}
ROUTE_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,127}\Z")


def invalid(message: str = "Invalid bounded job contract") -> CommandError:
    return CommandError(422, "INVALID_JOB", message)


def digest(value: object) -> str:
    return hashlib.sha256(_json(value).encode("utf-8")).hexdigest()


def instant(now: datetime | None = None) -> datetime:
    value = now if now is not None else datetime.now(UTC)
    if value.tzinfo is None:
        raise ValueError("Job clock requires an aware UTC instant")
    return value.astimezone(UTC)


def stamp(now: datetime) -> str:
    return instant(now).isoformat()


def portable(value: object, limit: int) -> None:
    _bounded(value, limit)
    pending = [value]
    while pending:
        item = pending.pop()
        if isinstance(item, dict):
            if any(key in {"__proto__", "prototype", "constructor"} for key in item):
                raise invalid("Reserved object keys are forbidden")
            pending.extend(item.values())
        elif isinstance(item, list):
            pending.extend(item)


def validate_job_request(value: object) -> dict[str, Any]:
    portable(value, 8192)
    if not REQUEST_VALIDATOR.is_valid(value):
        raise invalid("Invalid job request")
    return validate_proposal_request(value)


def validate_job(value: object) -> dict[str, Any]:
    portable(value, 32768)
    if not JOB_VALIDATOR.is_valid(value):
        raise invalid()
    job = cast(dict[str, Any], value)
    validate_job_request(job["request"])
    try:
        times = {key: datetime.fromisoformat(job[key]) for key in
                 ("createdAt", "updatedAt", "leaseExpiresAt", "nextAttemptAt")
                 if job[key] is not None}
    except ValueError as failure:
        raise invalid("Invalid UTC timestamp") from failure
    if (job["baseRevision"] != job["request"]["expectedRevision"]
            or times["updatedAt"] < times["createdAt"]):
        raise invalid()
    status, attempt = job["status"], job["attempt"]
    error, result, cost = job["error"], job["result"], job["actualCost"]
    lease, next_at, progress = job["leaseExpiresAt"], job["nextAttemptAt"], job["progress"]
    bad = False
    if status == "running":
        bad = (attempt < 1 or lease is None or times["leaseExpiresAt"] <= times["updatedAt"]
               or next_at is not None or error is not None or result is not None
               or cost is not None or progress >= 100)
    elif lease is not None:
        bad = True
    if status == "queued":
        bad |= (attempt >= 3 or error is not None or result is not None or cost is not None
                or next_at is not None or progress >= 100)
    elif status == "succeeded":
        bad |= (attempt < 1 or result is None or error is not None or cost is None
                or progress != 100 or next_at is not None)
    elif status == "failed":
        bad |= (attempt < 1 or error is None or result is not None or cost is None
                or progress >= 100
                or (attempt >= 3 and error is not None and error["retryable"])
                or (next_at is not None and (error is None or not error["retryable"]
                                            or times["nextAttemptAt"] <= times["updatedAt"])))
    elif status in {"cancelled", "stale"}:
        bad |= (result is not None or next_at is not None or progress >= 100 or error is None
                or error["retryable"] or ((cost is None) != (attempt == 0)))
    if bad:
        raise invalid("Job lifecycle metadata is inconsistent")
    return copy.deepcopy(job)


def parse_job_body(raw: bytes, *, decision: bool = False) -> object:
    if len(raw) > (64 if decision else 8192):
        raise invalid("Job request is too large")
    def pairs(items: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, value in items:
            if key in result:
                raise ValueError("Duplicate JSON key")
            result[key] = value
        return result
    def constant(value: str) -> Any:
        raise ValueError("Nonfinite JSON")
    try:
        value = json.loads(raw.decode("utf-8"), object_pairs_hook=pairs, parse_constant=constant)
        portable(value, 8192)
    except (ValueError, UnicodeError, RecursionError, OverflowError) as error:
        raise invalid("Invalid job JSON") from error
    if decision and (not isinstance(value, dict) or value):
        raise invalid("A job decision requires an empty JSON object")
    return value
