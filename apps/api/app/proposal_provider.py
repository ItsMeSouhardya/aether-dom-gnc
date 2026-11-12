"""Offline deterministic demonstration provider: no model, SDK, key or network."""

import json
from typing import Any, Protocol


class ProposalProvider(Protocol):
    name: str
    model_version: str

    def generate(self, context: dict[str, Any]) -> str: ...


class MockProposalProvider:
    name = "local_mock"
    model_version = "deterministic-demo-v1"

    def generate(self, context: dict[str, Any]) -> str:
        """Follow only the explicit scenario; the freeform message remains inert data."""
        target = context["scopeIds"][0]
        node = next(node for node in context["contextNodes"] if node["id"] == target)
        intent = context["intent"]
        args: dict[str, Any]
        if intent == "repair_pose":
            op, args = "setLayerPose", {"pose": "lifting_with_right_arm"}
        elif intent == "move_right":
            op, args = "setLayerTransform", {"x": node["value"]["transform"]["x"] + 0.25}
        elif intent == "set_tension":
            op, args = "setShotTension", {"tension": 0.8}
        else:
            raise ValueError("Unsupported deterministic scenario")
        return json.dumps(
            {
                "operations": [{"op": op, "targetId": target, "args": args}],
                "evidenceNodeIds": [item["id"] for item in context["contextNodes"]],
                "explanation": "Offline deterministic demo: "
                + intent.replace("_", " ")
                + ". The request message is context data, not interpreted instructions.",
            },
            allow_nan=False,
        )
