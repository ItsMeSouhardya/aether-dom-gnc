"""Bounded untrusted proposals, copy-only previews and exact approval revalidation."""

import copy
import hashlib
import json
import math
from typing import Any, cast

from jsonschema import Draft202012Validator

from app.commands import CommandError, _unique_entity, apply_operation, ensure_valid_document
from app.contracts import SCHEMA_ROOT
from app.proposal_provider import ProposalProvider


def _validator(name: str) -> Draft202012Validator:
    schema = json.loads((SCHEMA_ROOT / f"{name}.schema.json").read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema)


REQUEST_VALIDATOR = _validator("proposal-request")
PAYLOAD_VALIDATOR = _validator("proposal-payload")
PROPOSAL_VALIDATOR = _validator("proposal")
OP_NAMES = {
    "setLayerTransform",
    "setLayerPose",
    "setLayerAppearance",
    "setShotCamera",
    "setShotTension",
}


def _invalid(message: str = "Proposal violates its bounded permissions or schema") -> CommandError:
    return CommandError(422, "INVALID_PROPOSAL", message)


def _json(value: Any) -> str:
    return json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False
    )


def _bounded(value: object, byte_limit: int) -> None:
    pending: list[tuple[object, int]] = [(value, 0)]
    seen: set[int] = set()
    count = 0
    numeric_wire_allowance = 0
    while pending:
        child, depth = pending.pop()
        count += 1
        if count > 4096 or depth > 16:
            raise _invalid("Proposal JSON exceeds structural bounds")
        if isinstance(child, str):
            if any(0xD800 <= ord(char) <= 0xDFFF for char in child):
                raise _invalid("Proposal text must contain Unicode scalar values")
        elif isinstance(child, (int, float)):
            try:
                finite = math.isfinite(child)
            except OverflowError:
                finite = False
            if not finite:
                raise _invalid("Proposal numbers must be finite")
            if not isinstance(child, bool):
                # JSON.stringify can expand Python's exponent notation into a
                # longer decimal (1e20 adds 15 bytes). Reserve 16 per number in
                # every request/context/payload/record check, including the
                # final metadata reservation, so accepted server JSON fits the
                # same client byte limit after numeric decoding/serialization.
                numeric_wire_allowance += 16
        elif isinstance(child, (dict, list)):
            if id(child) in seen:
                raise _invalid("Proposal JSON must be a tree")
            seen.add(id(child))
            if isinstance(child, dict):
                for key, item in child.items():
                    if not isinstance(key, str):
                        raise _invalid()
                    pending.extend([(key, depth + 1), (item, depth + 1)])
            else:
                pending.extend((item, depth + 1) for item in child)
        elif child is not None:
            raise _invalid()
    if len(_json(value).encode("utf-8")) + numeric_wire_allowance > byte_limit:
        raise _invalid("Proposal JSON exceeds its byte limit")


def validate_proposal_request(value: object) -> dict[str, Any]:
    _bounded(value, 8192)
    if not REQUEST_VALIDATOR.is_valid(value):
        raise CommandError(422, "INVALID_PROPOSAL_REQUEST", "Invalid proposal request")
    return copy.deepcopy(cast(dict[str, Any], value))


def validate_proposal_record(value: object) -> dict[str, Any]:
    """Validate actual persisted/reviewed metadata against the client record boundary."""
    _bounded(value, 131072)
    if not PROPOSAL_VALIDATOR.is_valid(value):
        raise _invalid("Review record violates the shared proposal schema")
    record = cast(dict[str, Any], value)
    ids = {node["id"] for node in record["contextNodes"]}
    if (
        len(ids) != len(record["contextNodes"])
        or not set(record["scopeIds"]) <= ids
        or not set(record["evidenceNodeIds"]) <= ids
        or any(
            op["targetId"] not in record["scopeIds"] or op["op"] not in record["allowedOps"]
            for op in record["operations"]
        )
        or any(entry["entityId"] not in record["scopeIds"] for entry in record["diff"])
    ):
        raise _invalid("Review record exceeds its context or operation permissions")
    if record["status"] == "pending_review":
        invalid_decision = any(
            record[key] is not None
            for key in [
                "reviewedAt",
                "reviewedBy",
                "approvalCommandId",
            ]
        )
    else:
        invalid_decision = (
            record["reviewedAt"] is None
            or record["reviewedBy"] is None
            or ((record["approvalCommandId"] is None) != (record["status"] == "rejected"))
        )
    if invalid_decision:
        raise _invalid("Review record has inconsistent decision metadata")
    return copy.deepcopy(record)


def _base(document: dict[str, Any], expected: int) -> None:
    if expected != document["project"]["revision"]:
        raise CommandError(409, "REVISION_CONFLICT", "Proposal base revision is stale")


def build_context(document: dict[str, Any], request: dict[str, Any]) -> dict[str, Any]:
    request = validate_proposal_request(request)
    _base(document, request["expectedRevision"])
    ensure_valid_document(document)
    nodes: dict[str, dict[str, Any]] = {}

    def add(entity_id: str, kind: str, collection: str) -> dict[str, Any]:
        entity = _unique_entity(document, entity_id)
        if entity is None or not any(item["id"] == entity_id for item in document[collection]):
            raise _invalid("A context reference is missing or has the wrong kind")
        value = copy.deepcopy(entity)
        if kind == "character":
            value.pop("constraints", None)
        nodes[entity_id] = {"id": entity_id, "kind": kind, "value": value}
        return entity

    layer_ids = {item["id"] for item in document["layers"]}
    shot_ids = {item["id"] for item in document["shots"]}
    for entity_id in request["scopeIds"]:
        if entity_id in layer_ids:
            layer = add(entity_id, "layer", "layers")
            add(layer["shotId"], "shot", "shots")
            if layer["characterId"] is not None:
                character = add(layer["characterId"], "character", "characters")
                for constraint in character["constraints"]:
                    _unique_entity(document, constraint["id"])
                    nodes[constraint["id"]] = {
                        "id": constraint["id"],
                        "kind": "constraint",
                        "value": copy.deepcopy(constraint),
                    }
                    for key in ["effectiveFromEventId", "resolvedByEventId"]:
                        if constraint.get(key) is not None:
                            add(constraint[key], "event", "events")
        elif entity_id in shot_ids:
            add(entity_id, "shot", "shots")
        else:
            raise _invalid("Only selected layers and shots may be editable")
    if len(nodes) > 32:
        raise _invalid("Proposal context exceeds 32 nodes")
    context = {
        "projectId": document["project"]["id"],
        "branchId": document["project"]["activeBranchId"],
        "baseRevision": request["expectedRevision"],
        "scopeIds": request["scopeIds"],
        "allowedOps": request["allowedOps"],
        "intent": request["intent"],
        "message": request["message"],
        "contextNodes": [nodes[key] for key in sorted(nodes)],
    }
    _bounded(context, 65536)
    return context


def _parse(raw: object) -> dict[str, Any]:
    if not isinstance(raw, str):
        raise _invalid("Provider must return a JSON string")
    try:
        if len(raw.encode("utf-8")) > 32768:
            raise _invalid("Provider response exceeds 32 KiB")

        def pairs(items: list[tuple[str, Any]]) -> dict[str, Any]:
            result: dict[str, Any] = {}
            for key, item in items:
                if key in result:
                    raise ValueError("Duplicate key")
                result[key] = item
            return result

        def constant(value: str) -> Any:
            raise ValueError("Non-finite constant")

        value = json.loads(raw, object_pairs_hook=pairs, parse_constant=constant)
        _bounded(value, 32768)
    except (ValueError, UnicodeError, RecursionError, OverflowError) as error:
        raise _invalid("Provider returned invalid bounded JSON") from error
    if not PAYLOAD_VALIDATOR.is_valid(value):
        raise _invalid("Provider response violates the proposal schema")
    return cast(dict[str, Any], value)


def _diff(before: dict[str, Any], after: dict[str, Any], scope: list[str]) -> list[dict[str, Any]]:
    diff: list[dict[str, Any]] = []

    def walk(entity_id: str, left: Any, right: Any, path: str, lp: bool, rp: bool) -> None:
        if lp == rp and left == right:
            return
        if (isinstance(left, dict) and (isinstance(right, dict) or not rp)) or (
            isinstance(right, dict) and not lp
        ):
            left_fields = left if isinstance(left, dict) else {}
            right_fields = right if isinstance(right, dict) else {}
            for key in sorted(left_fields.keys() | right_fields.keys()):
                walk(
                    entity_id,
                    left_fields.get(key),
                    right_fields.get(key),
                    f"{path}.{key}" if path else key,
                    key in left_fields,
                    key in right_fields,
                )
        else:
            diff.append(
                {
                    "entityId": entity_id,
                    "path": path,
                    "before": copy.deepcopy(left),
                    "after": copy.deepcopy(right),
                    "beforePresent": lp,
                    "afterPresent": rp,
                }
            )

    for entity_id in sorted(scope):
        walk(
            entity_id,
            _unique_entity(before, entity_id),
            _unique_entity(after, entity_id),
            "",
            True,
            True,
        )
    return diff


def _dry_run(
    document: dict[str, Any], context: dict[str, Any], payload: dict[str, Any]
) -> tuple[
    dict[str, Any],
    list[str],
    list[dict[str, Any]],
]:
    ids = {node["id"] for node in context["contextNodes"]}
    if not set(payload["evidenceNodeIds"]) <= ids:
        raise _invalid("Evidence must refer only to supplied context nodes")
    kinds = {node["id"]: node["kind"] for node in context["contextNodes"]}
    result = copy.deepcopy(document)
    changed: set[str] = set()
    for operation in payload["operations"]:
        op, target = operation["op"], operation["targetId"]
        if (
            op not in OP_NAMES
            or op not in context["allowedOps"]
            or target not in context["scopeIds"]
        ):
            raise _invalid("Operation exceeds the creator's explicit permissions")
        kind = "shot" if op in {"setShotCamera", "setShotTension"} else "layer"
        if kinds.get(target) != kind:
            raise _invalid("Operation target has the wrong kind")
        try:
            result, _, _, affected = apply_operation(result, operation)
        except CommandError as error:
            raise _invalid("Proposed operation violates domain invariants") from error
        changed.update(affected)
    diff = _diff(document, result, context["scopeIds"])
    if not diff:
        raise _invalid("Proposal makes no authored changes")
    return result, sorted(changed), diff


def prepare_proposal(
    document: dict[str, Any], request: dict[str, Any], provider: ProposalProvider
) -> dict[str, Any]:
    context = build_context(document, request)
    trusted_context = copy.deepcopy(context)
    try:
        name, model = provider.name, provider.model_version
        if name != "local_mock" or not isinstance(model, str) or not 1 <= len(model) <= 128:
            raise _invalid("Unsupported local provider metadata")
        _bounded(model, 512)
        raw = provider.generate(copy.deepcopy(context))
    except Exception as error:
        raise _invalid("Local proposal provider failed; no proposal was created") from error
    payload = _parse(raw)
    result, _, diff = _dry_run(document, trusted_context, payload)
    role = {"repair_pose": "lore", "move_right": "visual", "set_tension": "acoustic"}
    draft = {
        "agentRole": role[request["intent"]],
        **copy.deepcopy(payload),
        "contextNodes": trusted_context["contextNodes"],
        "contextDigest": hashlib.sha256(_json(trusted_context).encode("utf-8")).hexdigest(),
        "diff": diff,
        "schemaVersionBefore": document["schemaVersion"],
        "schemaVersionAfter": result["schemaVersion"],
        "provider": name,
        "modelVersion": model,
        "estimatedCost": {"amount": 0, "currency": "USD"},
        "previewRef": None,
    }
    record = {
        **draft,
        "proposalId": "preview",
        "projectId": context["projectId"],
        "branchId": context["branchId"],
        "baseRevision": context["baseRevision"],
        **{key: context[key] for key in ["scopeIds", "allowedOps", "intent", "message"]},
        "status": "pending_review",
        "createdAt": "preview",
        "reviewedAt": None,
        "reviewedBy": None,
        "approvalCommandId": None,
    }
    validate_proposal_record(record)
    # Reserve the maximum serialized width of server-added identity and future
    # decision strings before accepting a preview. JSON control characters use
    # six bytes per scalar, larger than even four-byte UTF-8 text. The same keys
    # and value count remain within the unchanged shared structural budget.
    _bounded(
        {
            **record,
            **{
                key: "\0" * 128
                for key in [
                    "proposalId",
                    "projectId",
                    "branchId",
                    "reviewedBy",
                    "approvalCommandId",
                ]
            },
            "createdAt": "\0" * 64,
            "reviewedAt": "\0" * 64,
        },
        131072,
    )
    return draft


def apply_proposal(
    document: dict[str, Any], proposal: dict[str, Any]
) -> tuple[
    dict[str, Any],
    list[str],
]:
    _bounded(proposal, 131072)
    try:
        _base(document, proposal["baseRevision"])
        if (
            proposal["projectId"] != document["project"]["id"]
            or proposal["branchId"] != document["project"]["activeBranchId"]
        ):
            raise _invalid("Proposal belongs to another project or branch")
        request = {key: proposal[key] for key in ["scopeIds", "allowedOps", "intent", "message"]}
        request.update(
            {"requestId": "stored_proposal", "expectedRevision": proposal["baseRevision"]}
        )
        context = build_context(document, request)
        digest = hashlib.sha256(_json(context).encode("utf-8")).hexdigest()
        if (
            proposal["contextNodes"] != context["contextNodes"]
            or proposal["contextDigest"] != digest
        ):
            raise _invalid("Stored proposal context differs from its captured base")
        payload = _parse(
            _json(
                {
                    key: proposal[key]
                    for key in [
                        "operations",
                        "evidenceNodeIds",
                        "explanation",
                    ]
                }
            )
        )
        result, changed, diff = _dry_run(document, context, payload)
        if (
            proposal["diff"] != diff
            or proposal["schemaVersionBefore"] != document["schemaVersion"]
            or proposal["schemaVersionAfter"] != result["schemaVersion"]
        ):
            raise _invalid("Stored preview differs from the exact operation result")
        return result, changed
    except (KeyError, TypeError, ValueError) as error:
        raise _invalid("Stored proposal is invalid") from error
