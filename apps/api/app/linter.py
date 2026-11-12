"""Pure revision-bound structural and physical continuity diagnostics.

No authored value is repaired, binding evaluated, dialogue inferred or media
opened here. Filesystem observations arrive through the optional asset inventory.
"""

import hashlib
import math
import re
from collections import defaultdict
from collections.abc import Iterable
from typing import Any

from app.dependency_graph import build_graph, entity_records

POSE_LIMBS = {
    "standing": None,
    "lifting_with_left_arm": "left_arm",
    "lifting_with_right_arm": "right_arm",
}


class _Rules:
    def __init__(self, document: dict[str, Any]):
        self.document = document
        self.records = entity_records(document)
        self.by_id: dict[str, list[tuple[str, dict[str, Any], str]]] = defaultdict(list)
        self.issues: dict[str, dict[str, Any]] = {}
        for entity_id, kind, entity, path in self.records:
            self.by_id[entity_id].append((kind, entity, path))

    def get(self, entity_id: str | None, kind: str | None = None) -> dict[str, Any] | None:
        records = self.by_id.get(entity_id or "", [])
        if len(records) == 1 and (kind is None or records[0][0] == kind):
            return records[0][1]
        return None

    def path(self, entity_id: str, suffix: str = "") -> str:
        records = self.by_id.get(entity_id, [])
        return (records[0][2] if records else "") + suffix

    def evidence(self, entity_id: str, suffix: str, message: str) -> dict[str, str]:
        return {"entityId": entity_id, "path": self.path(entity_id, suffix), "message": message}

    def emit(
        self,
        code: str,
        subject: str,
        suffix: str,
        message: str,
        evidence: list[dict[str, str]] | None = None,
        *,
        severity: str = "warning",
        token: str = "",
    ) -> None:
        # Numeric array positions belong in navigation pointers, not identity.
        identity = f"{code}|{subject}|{re.sub(r'/\d+(?=/|$)', '', suffix)}|{token}"
        issue_id = "diag_" + hashlib.sha256(identity.encode()).hexdigest()[:20]
        self.issues[issue_id] = {
            "id": issue_id,
            "code": code,
            "severity": severity,
            "subjectId": subject,
            "path": self.path(subject, suffix),
            "message": message,
            "evidence": evidence or [self.evidence(subject, suffix, message)],
        }

    def ref(
        self, subject: str, suffix: str, target: str | None, kind: str, *, nullable: bool = False
    ) -> dict[str, Any] | None:
        if target is None and nullable:
            return None
        result = self.get(target, kind)
        if result is None:
            label = target or "(missing ID)"
            self.emit(
                "reference.missing",
                subject,
                suffix,
                f"Expected a unique {kind} reference; {label} is missing or ambiguous.",
                token=label,
                severity="error",
            )
        return result

    def references(self) -> None:
        for entity_id, records in sorted(self.by_id.items()):
            if len(records) > 1:
                self.emit(
                    "reference.duplicate_id",
                    entity_id,
                    "/id",
                    f"Global entity ID {entity_id} occurs {len(records)} times.",
                    [
                        {
                            "entityId": entity_id,
                            "path": path + "/id",
                            "message": f"Duplicate {kind} ID",
                        }
                        for kind, _, path in records
                    ],
                    severity="error",
                )
        scalar = {
            "project": [("activeBranchId", "branch", False)],
            "branch": [("parentId", "branch", True)],
            "constraint": [
                ("effectiveFromEventId", "event", False),
                ("resolvedByEventId", "event", True),
            ],
            "event": [("sceneId", "scene", False)],
            "shot": [("sceneId", "scene", False)],
            "layer": [
                ("shotId", "shot", False),
                ("assetId", "asset", False),
                ("characterId", "character", True),
            ],
            "audio_track": [
                ("shotId", "shot", False),
                ("assetId", "asset", False),
                ("boundLayerId", "layer", True),
            ],
        }
        for entity_id, kind, entity, _ in self.records:
            for field, target_kind, nullable in scalar.get(kind, []):
                self.ref(entity_id, "/" + field, entity.get(field), target_kind, nullable=nullable)
            if kind == "binding":
                for side in ("source", "target"):
                    target = entity.get(side, {}).get("entityId")
                    if self.get(target) is None:
                        self.emit(
                            "reference.missing",
                            entity_id,
                            f"/{side}/entityId",
                            f"Binding {side} {target} is missing or ambiguous.",
                            severity="error",
                        )
            if kind == "scene":
                self.members(entity_id, entity, "eventIds", "event", "sceneId")
                self.members(entity_id, entity, "shotIds", "shot", "sceneId")
            elif kind == "shot":
                self.members(entity_id, entity, "layerIds", "layer", "shotId")
                self.members(entity_id, entity, "audioTrackIds", "audio_track", "shotId")
                for ratio, override in entity.get("layoutOverrides", {}).items():
                    for layer_id in override.get("layerTransforms", {}):
                        self.ref(
                            entity_id,
                            f"/layoutOverrides/{ratio}/layerTransforms/{layer_id}",
                            layer_id,
                            "layer",
                        )
                        if layer_id not in entity.get("layerIds", []):
                            self.emit(
                                "reference.membership",
                                entity_id,
                                "/layoutOverrides",
                                f"Override layer {layer_id} is not a member of this shot.",
                                token=layer_id,
                            )

        # Check the inverse as well: an unlisted child would escape a list-only check.
        owners = {
            "event": ("scene", "sceneId", "eventIds"),
            "shot": ("scene", "sceneId", "shotIds"),
            "layer": ("shot", "shotId", "layerIds"),
            "audio_track": ("shot", "shotId", "audioTrackIds"),
        }
        for entity_id, kind, entity, _ in self.records:
            if kind in owners:
                owner_kind, field, members = owners[kind]
                owner = self.get(entity.get(field), owner_kind)
                if owner and entity_id not in owner.get(members, []):
                    self.emit(
                        "reference.membership",
                        entity_id,
                        "/" + field,
                        f"{entity_id} is absent from {owner['id']}.{members}.",
                    )
            if kind == "audio_track" and entity.get("boundLayerId"):
                layer = self.get(entity["boundLayerId"], "layer")
                if layer and layer.get("shotId") != entity.get("shotId"):
                    self.emit(
                        "reference.membership",
                        entity_id,
                        "/boundLayerId",
                        "Bound Foley layer belongs to a different shot.",
                    )

    def members(
        self, owner_id: str, owner: dict[str, Any], field: str, kind: str, backlink: str
    ) -> None:
        seen: set[str] = set()
        for index, member_id in enumerate(owner.get(field, [])):
            child = self.ref(owner_id, f"/{field}/{index}", member_id, kind)
            if member_id in seen or child and child.get(backlink) != owner_id:
                self.emit(
                    "reference.membership",
                    owner_id,
                    f"/{field}/{index}",
                    f"{member_id} has duplicate or mismatched {backlink} membership.",
                    token=member_id,
                )
            seen.add(member_id)

    def bindings(self) -> None:
        for binding in self.document.get("bindings", []):
            binding_id = binding["id"]
            for side in ("source", "target"):
                endpoint = binding.get(side, {})
                entity_id = endpoint.get("entityId")
                entity = self.get(entity_id)
                if entity is None:
                    continue  # reference diagnostics already explain ambiguity
                path = endpoint.get("path", "")
                value: Any = entity
                for part in path.split("."):
                    value = value.get(part) if isinstance(value, dict) else None
                # Spatial coordinates are derived WebAudio outputs, never fields
                # inserted into the authored track by this graph/linter.
                derived = (
                    side == "target"
                    and self.get(entity_id, "audio_track") is not None
                    and path in {"spatial.x", "spatial.y", "spatial.z"}
                )
                if not derived and not _finite_number(value):
                    self.emit(
                        "binding.invalid_path",
                        binding_id,
                        f"/{side}/path",
                        f"{entity_id}.{path} is not a supported numeric {side} path.",
                        token=side,
                    )
            mapping = binding.get("mapping", {})
            if mapping.get("kind") == "linear":
                values = [
                    mapping.get(key) for key in ("inputMin", "inputMax", "outputMin", "outputMax")
                ]
                if not all(_finite_number(value) for value in values) or values[0] >= values[1]:
                    self.emit(
                        "binding.invalid_range",
                        binding_id,
                        "/mapping",
                        "Linear mapping needs finite bounds and inputMin < inputMax.",
                    )
            elif mapping.get("kind") != "identity":
                self.emit(
                    "binding.invalid_range",
                    binding_id,
                    "/mapping",
                    "Unsupported binding mapping semantics.",
                )

    def physical(self) -> None:
        for entity_id, kind, entity, _ in self.records:
            if kind == "constraint" and not _supported_constraint(entity):
                self.emit(
                    "physical.unsupported_constraint",
                    entity_id,
                    "/type",
                    "Constraint semantics are unsupported; physical continuity is unchecked.",
                )
        event_orders: dict[int, list[str]] = defaultdict(list)
        bad_events: set[str] = set()
        for event in self.document.get("events", []):
            event_id = event["id"]
            order = event.get("order")
            scene = self.get(event.get("sceneId"), "scene")
            if (
                not _finite_number(order)
                or not 0 <= order <= 9007199254740991
                or order != int(order)
                or self.get(event_id, "event") is None
                or scene is None
                or scene.get("eventIds", []).count(event_id) != 1
            ):
                bad_events.add(event_id)
                self.emit(
                    "timeline.ambiguous",
                    event_id,
                    "/order",
                    "Event chronology needs a unique nonnegative safe order and scene membership.",
                )
            else:
                event_orders[int(order)].append(event_id)
        for ids in event_orders.values():
            if len(ids) > 1:
                bad_events.update(ids)
                for event_id in ids:
                    self.emit(
                        "timeline.ambiguous",
                        event_id,
                        "/order",
                        "Multiple events share this order; chronology is ambiguous.",
                    )

        anchors: dict[str, int | None] = {}
        for scene in self.document.get("scenes", []):
            event_ids = scene.get("eventIds", [])
            events = [self.get(event_id, "event") for event_id in event_ids]
            valid = (
                bool(events)
                and len(event_ids) == len(set(event_ids))
                and all(
                    event is not None
                    and event["id"] not in bad_events
                    and event.get("sceneId") == scene["id"]
                    for event in events
                )
            )
            anchors[scene["id"]] = (
                max(event["order"] for event in events if event) if valid else None
            )

        for layer in self.document.get("layers", []):
            character = self.get(layer.get("characterId"), "character")
            if character is None:
                continue
            layer_id = layer["id"]
            pose = layer.get("pose")
            if pose is not None and pose not in POSE_LIMBS:
                self.emit(
                    "physical.unsupported_pose",
                    layer_id,
                    "/pose",
                    f"Pose {pose} has no supported physical semantics; continuity is unchecked.",
                )
            shot = self.get(layer.get("shotId"), "shot")
            scene_id = shot.get("sceneId") if shot else None
            anchor = anchors.get(scene_id or "")
            for constraint in character.get("constraints", []):
                constraint_id = constraint["id"]
                if not _supported_constraint(constraint):
                    continue
                start_id = constraint.get("effectiveFromEventId")
                end_id = constraint.get("resolvedByEventId")
                start = self.get(start_id, "event")
                end = self.get(end_id, "event") if end_id else None
                valid = (
                    anchor is not None
                    and start is not None
                    and start_id not in bad_events
                    and self.get(constraint_id, "constraint") is not None
                )
                if end_id:
                    valid = (
                        valid
                        and end is not None
                        and end_id not in bad_events
                        and start is not None
                        and end["order"] > start["order"]
                    )
                if not valid:
                    self.emit(
                        "timeline.ambiguous",
                        layer_id,
                        "/pose",
                        "Cannot establish this pose's injury/recovery window from scene events.",
                        [
                            self.evidence(layer_id, "/pose", "Pose needing continuity evaluation"),
                            self.evidence(
                                constraint_id, "", "Uncertain injury/recovery chronology"
                            ),
                        ],
                        token=constraint_id,
                    )
                    continue
                assert anchor is not None and start is not None
                if (
                    pose in POSE_LIMBS
                    and POSE_LIMBS[pose] == constraint["limb"]
                    and start["order"] <= anchor
                    and (end is None or anchor < end["order"])
                ):
                    self.emit(
                        "CANON_PHYSICAL_CONFLICT",
                        layer_id,
                        "/pose",
                        f"{character['name']} uses an injured "
                        f"{constraint['limb'].replace('_', ' ')}.",
                        [
                            self.evidence(layer_id, "/pose", f"Authored pose: {pose}"),
                            self.evidence(constraint_id, "", "Active limb injury constraint"),
                            self.evidence(
                                start["id"], "/order", start.get("description", "Injury starts")
                            ),
                            self.evidence(
                                scene_id or "",
                                "/eventIds",
                                f"Shot follows scene event order {anchor}",
                            ),
                        ],
                        token=constraint_id,
                    )

    def assets(self, asset_status: dict[str, str] | None) -> None:
        for asset in self.document.get("assets", []):
            status = (asset_status or {}).get(asset["id"], "unchecked")
            if status == "present":
                continue
            if status not in {"missing", "unsafe", "external", "unchecked"}:
                status = "unchecked"
            messages = {
                "missing": "Referenced local asset file is absent.",
                "unsafe": "Asset URI escapes allowed local assets or is unsafe; it was not opened.",
                "external": "External asset availability is unchecked; no network request made.",
                "unchecked": "Local asset availability has not been checked.",
            }
            self.emit("asset." + status, asset["id"], "/uri", messages[status])


def _supported_constraint(constraint: dict[str, Any]) -> bool:
    return constraint.get("type") == "limb_injury" and constraint.get("limb") in {
        "left_arm",
        "right_arm",
    }


def _finite_number(value: Any) -> bool:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    try:
        return math.isfinite(value)
    except OverflowError:
        return False


def analyze_document(
    document: dict[str, Any],
    changed_entity_ids: Iterable[str] = (),
    asset_status: dict[str, str] | None = None,
    previous_document: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Recompute complete analysis against exactly the supplied canonical snapshot."""
    graph = build_graph(document)
    rules = _Rules(document)
    rules.references()
    rules.bindings()
    rules.physical()
    rules.assets(asset_status)
    for entity_id in graph.cycle_node_ids:
        rules.emit(
            "binding.cycle",
            entity_id,
            "",
            "Dependency cycle blocks this node and its dependents.",
            severity="error",
        )
    return {
        "revision": document.get("project", {}).get("revision", 0),
        "issues": sorted(
            rules.issues.values(),
            key=lambda issue: (issue["code"], issue["subjectId"], issue["id"]),
        ),
        "graph": graph.to_dict(),
        "invalidation": graph.invalidate(
            changed_entity_ids, build_graph(previous_document) if previous_document else None,
        ),
    }
