"""Hand-derived dependency impact and bounded graph traversal behavior."""

from copy import deepcopy

from app.contracts import load_fixture
from app.dependency_graph import build_graph


def test_foley_change_invalidates_aggregates_in_dependency_order() -> None:
    graph = build_graph(load_fixture())
    assert graph.invalidate(["asset_foley", "removed", "asset_foley"]) == {
        "changedEntityIds": ["asset_foley", "removed"],
        "impactedEntityIds": [
            "proj_neon_shogun",
            "scene_rooftop",
            "shot_rooftop",
            "track_sign_foley",
        ],
        "evaluationOrder": [
            "asset_foley",
            "track_sign_foley",
            "shot_rooftop",
            "scene_rooftop",
            "proj_neon_shogun",
        ],
        "cycleNodeIds": [],
    }
    assert "layer_sign" in graph.dependencies["track_sign_foley"]
    assert "track_sign_foley" in graph.dependents["layer_sign"]


def test_graph_is_stable_without_mutating_authored_arrays() -> None:
    document = load_fixture()
    before = deepcopy(document)
    expected = build_graph(document).to_dict()
    assert document == before
    for value in document.values():
        if isinstance(value, list):
            value.reverse()
    assert build_graph(document).to_dict() == expected
    assert expected["cycleNodeIds"] == []
    assert {
        "sourceId": "event_injury",
        "targetId": "constraint_kael_left_arm",
        "kind": "caused_by",
    } in expected["edges"]


def test_cycles_report_only_members_and_block_downstream_evaluation() -> None:
    document = load_fixture()
    document["bindings"] = [
        {
            "id": "ab",
            "source": {"entityId": "layer_kael", "path": "transform.x"},
            "target": {"entityId": "layer_vance", "path": "transform.x"},
            "mapping": {"kind": "identity"},
        },
        {
            "id": "ba",
            "source": {"entityId": "layer_vance", "path": "transform.x"},
            "target": {"entityId": "layer_kael", "path": "transform.x"},
            "mapping": {"kind": "identity"},
        },
    ]
    graph = build_graph(document)
    assert graph.to_dict()["cycleNodeIds"] == ["ab", "ba", "layer_kael", "layer_vance"]
    result = graph.invalidate(["layer_kael"])
    assert result["evaluationOrder"] == []
    assert "shot_rooftop" in result["impactedEntityIds"]


def test_deep_dependency_chains_do_not_use_python_recursion() -> None:
    document = {"project": {"id": "project"}, "layers": [], "bindings": []}
    for index in range(1600):
        document["layers"].append({"id": f"node{index:04}"})
        if index:
            document["bindings"].append(
                {
                    "id": f"binding{index:04}",
                    "source": {"entityId": f"node{index - 1:04}"},
                    "target": {"entityId": f"node{index:04}"},
                }
            )
    graph = build_graph(document)
    result = graph.invalidate(["node0000"])
    assert len(result["evaluationOrder"]) == 3199
    assert result["evaluationOrder"][-1] == "node1599"
    assert result["cycleNodeIds"] == []


def test_duplicate_scene_references_do_not_make_graph_depend_on_array_order() -> None:
    document = load_fixture()
    document["scenes"].append(
        {
            "id": "scene_rooftop",
            "title": "Duplicate",
            "eventIds": ["event_injury"],
            "shotIds": ["shot_rooftop"],
        }
    )
    expected = build_graph(document).to_dict()
    document["scenes"].reverse()
    assert build_graph(document).to_dict() == expected
