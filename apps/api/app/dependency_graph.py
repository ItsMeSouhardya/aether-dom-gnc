"""Deterministic dependency indexes; edges point from input to consumer.

This reports invalidation for future evaluators. It never evaluates bindings or
modifies authored state. Traversal and strongly connected components are iterative.
"""

import heapq
import json
from collections.abc import Iterable
from typing import Any

COLLECTION_KINDS = {
    "branches": "branch",
    "characters": "character",
    "events": "event",
    "scenes": "scene",
    "shots": "shot",
    "assets": "asset",
    "layers": "layer",
    "audioTracks": "audio_track",
    "bindings": "binding",
}


def entity_records(document: dict[str, Any]) -> list[tuple[str, str, dict[str, Any], str]]:
    """Retain duplicate records and source pointers for reference diagnostics."""
    result = []
    project = document.get("project", {})
    if project.get("id"):
        result.append((project["id"], "project", project, "/project"))
    for collection, kind in COLLECTION_KINDS.items():
        for index, entity in enumerate(document.get(collection, [])):
            path = f"/{collection}/{index}"
            if entity.get("id"):
                result.append((entity["id"], kind, entity, path))
            if kind == "layer":
                for offset, keyframe in enumerate(entity.get("keyframes", [])):
                    if keyframe.get("id"):
                        result.append((keyframe["id"], "keyframe", keyframe,
                                       f"{path}/keyframes/{offset}"))
            if kind == "character":
                for offset, constraint in enumerate(entity.get("constraints", [])):
                    if constraint.get("id"):
                        result.append(
                            (
                                constraint["id"],
                                "constraint",
                                constraint,
                                f"{path}/constraints/{offset}",
                            )
                        )
    return result


class DependencyGraph:
    """Stable input/output indexes with bounded impact and cycle reporting."""

    def __init__(self, nodes: dict[str, dict[str, str]], edges: set[tuple[str, str, str]]):
        self.nodes = {key: nodes[key] for key in sorted(nodes)}
        self.edges = sorted(edges)
        forward: dict[str, set[str]] = {key: set() for key in nodes}
        reverse: dict[str, set[str]] = {key: set() for key in nodes}
        for source, target, _ in edges:
            forward[source].add(target)
            reverse[target].add(source)
        self.dependents = {key: tuple(sorted(forward[key])) for key in sorted(nodes)}
        self.dependencies = {key: tuple(sorted(reverse[key])) for key in sorted(nodes)}
        self.cycle_node_ids = self._cycle_members()

    def _cycle_members(self) -> list[str]:
        # Kosaraju's two passes, including explicit DFS exit frames. A simple
        # Kahn remainder would incorrectly call downstream blocked nodes cycles.
        seen: set[str] = set()
        finished: list[str] = []
        for start in self.nodes:
            if start in seen:
                continue
            stack = [(start, False)]
            while stack:
                node, exiting = stack.pop()
                if exiting:
                    finished.append(node)
                    continue
                if node in seen:
                    continue
                seen.add(node)
                stack.append((node, True))
                stack.extend(
                    (child, False) for child in reversed(self.dependents[node]) if child not in seen
                )
        assigned: set[str] = set()
        cycles: set[str] = set()
        for start in reversed(finished):
            if start in assigned:
                continue
            members: set[str] = set()
            pending = [start]
            assigned.add(start)
            while pending:
                node = pending.pop()
                members.add(node)
                for parent in self.dependencies[node]:
                    if parent not in assigned:
                        assigned.add(parent)
                        pending.append(parent)
            if len(members) > 1 or start in self.dependents[start]:
                cycles.update(members)
        return sorted(cycles)

    def to_dict(self) -> dict[str, Any]:
        return {
            "nodes": [dict(node) for node in self.nodes.values()],
            "edges": [
                {"sourceId": source, "targetId": target, "kind": kind}
                for source, target, kind in self.edges
            ],
            "cycleNodeIds": list(self.cycle_node_ids),
        }

    def invalidate(
        self, changed_entity_ids: Iterable[str], previous: "DependencyGraph | None" = None,
    ) -> dict[str, Any]:
        changed = set(changed_entity_ids)
        affected = set(changed)
        pending = list(affected)
        while pending:
            node = pending.pop()
            children = set(self.dependents.get(node, ()))
            if previous is not None:
                children.update(previous.dependents.get(node, ()))
            for child in children:
                if child not in affected:
                    affected.add(child)
                    pending.append(child)
        affected.intersection_update(self.nodes)
        # A changed downstream node also cannot evaluate while an upstream cycle
        # is unresolved, even when the cycle was not itself in this dirty set.
        blocked = set(self.cycle_node_ids)
        pending = list(blocked)
        while pending:
            for child in self.dependents[pending.pop()]:
                if child not in blocked:
                    blocked.add(child)
                    pending.append(child)
        evaluable = affected - blocked
        degrees = {node: len(set(self.dependencies[node]) & evaluable) for node in evaluable}
        ready = [node for node, degree in degrees.items() if degree == 0]
        heapq.heapify(ready)
        order = []
        while ready:
            node = heapq.heappop(ready)
            order.append(node)
            for child in self.dependents[node]:
                if child in degrees:
                    degrees[child] -= 1
                    if degrees[child] == 0:
                        heapq.heappush(ready, child)
        return {
            "changedEntityIds": sorted(changed),
            "impactedEntityIds": sorted(affected - changed),
            "evaluationOrder": order,
            "cycleNodeIds": sorted(affected.intersection(self.cycle_node_ids)),
        }


def build_graph(document: dict[str, Any]) -> DependencyGraph:
    """Index canonical references without adding reciprocal containment edges."""
    records = entity_records(document)
    nodes: dict[str, dict[str, str]] = {}
    # Sorting duplicate payloads avoids choosing an array-order dependent label.
    for entity_id, kind, entity, _ in sorted(
        records, key=lambda row: (row[0], row[1], json.dumps(row[2], sort_keys=True))
    ):
        nodes.setdefault(
            entity_id,
            {
                "id": entity_id,
                "kind": kind,
                "label": entity.get("name", entity.get("title", entity_id)),
            },
        )
    edges: set[tuple[str, str, str]] = set()

    def edge(source: str | None, target: str | None, kind: str) -> None:
        if source in nodes and target in nodes:
            assert source is not None and target is not None
            edges.add((source, target, kind))

    project_id = document.get("project", {}).get("id")
    scene_events: dict[str, set[str]] = {}
    for scene in document.get("scenes", []):
        scene_events.setdefault(scene["id"], set()).update(scene.get("eventIds", []))
    shot_scenes: dict[str, set[str]] = {}
    for shot in document.get("shots", []):
        shot_scenes.setdefault(shot["id"], set()).add(shot.get("sceneId", ""))
    for entity_id, kind, entity, _ in records:
        if kind == "branch":
            edge(entity.get("parentId"), entity_id, "branches_from")
        elif kind == "character":
            for constraint in entity.get("constraints", []):
                edge(constraint.get("id"), entity_id, "constrains")
        elif kind == "constraint":
            edge(entity.get("effectiveFromEventId"), entity_id, "caused_by")
            edge(entity.get("resolvedByEventId"), entity_id, "resolved_by")
        elif kind == "event":
            edge(entity_id, entity.get("sceneId"), "aggregates")
        elif kind == "scene":
            edge(entity_id, project_id, "aggregates")
            for event_id in entity.get("eventIds", []):
                edge(event_id, entity_id, "aggregates")
            for shot_id in entity.get("shotIds", []):
                edge(shot_id, entity_id, "aggregates")
        elif kind == "shot":
            edge(entity_id, entity.get("sceneId"), "aggregates")
            for event_id in scene_events.get(entity.get("sceneId", ""), set()):
                edge(event_id, entity_id, "chronology")
            for child in entity.get("layerIds", []) + entity.get("audioTrackIds", []):
                edge(child, entity_id, "aggregates")
        elif kind in {"layer", "audio_track"}:
            if kind == "layer":
                for keyframe in entity.get("keyframes", []):
                    edge(keyframe.get("id"), entity_id, "animates")
            edge(entity.get("assetId"), entity_id, "uses_asset")
            edge(entity_id, entity.get("shotId"), "aggregates")
            edge(entity.get("characterId"), entity_id, "appears_in")
            edge(entity.get("boundLayerId"), entity_id, "emits_audio")
            if kind == "layer" and entity.get("characterId"):
                for scene_id in shot_scenes.get(entity.get("shotId", ""), set()):
                    for event_id in scene_events.get(scene_id, set()):
                        edge(event_id, entity_id, "chronology")
        elif kind == "binding":
            edge(entity.get("source", {}).get("entityId"), entity_id, "binding_input")
            edge(entity_id, entity.get("target", {}).get("entityId"), "binding_output")
    edge(document.get("project", {}).get("activeBranchId"), project_id, "active_branch")
    return DependencyGraph(nodes, edges)
