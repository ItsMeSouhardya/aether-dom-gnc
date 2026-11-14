from copy import deepcopy

from app.contracts import load_fixture
from app.dependency_graph import build_graph, entity_records


def test_rig_invalidation_follows_children_not_siblings_and_old_frames():
    document = load_fixture()
    layer = next(item for item in document["layers"] if item["id"] == "layer_kael")
    layer["rig"] = {
        "id": "rig",
        "name": "Rig",
        "bones": [
            {"id": "root", "name": "Root", "parentId": None},
            {"id": "left", "name": "Left", "parentId": "root", "keyframes": [{"id": "frame"}]},
            {"id": "hand", "name": "Hand", "parentId": "left"},
            {"id": "right", "name": "Right", "parentId": "root"},
        ],
        "attachments": [
            {"id": "left_slot", "name": "Left slot", "boneId": "left"},
            {"id": "hand_slot", "name": "Hand slot", "boneId": "hand"},
            {"id": "right_slot", "name": "Right slot", "boneId": "right"},
        ],
    }
    graph = build_graph(document)
    records = {row[0]: row[3] for row in entity_records(document)}
    assert records["frame"].endswith("/rig/bones/1/keyframes/0")
    assert graph.cycle_node_ids == []
    impact = set(graph.invalidate(["left"])["impactedEntityIds"])
    assert impact == {"hand", "left_slot", "hand_slot", "shot_rooftop",
                      "scene_rooftop", "proj_neon_shogun"}
    assert not {"root", "right", "right_slot", "layer_kael", "rig"} & impact
    changed = deepcopy(document)
    changed["layers"][document["layers"].index(layer)]["rig"]["bones"][1]["keyframes"] = []
    restored = build_graph(changed).invalidate(["frame"], graph)
    assert set(restored["impactedEntityIds"]) == impact | {"left"}
    assert "right" not in restored["impactedEntityIds"]


def test_rig_semantics_require_explicit_action_and_link_injury_evidence():
    from app.linter import analyze_document

    document = load_fixture()
    layer = next(item for item in document["layers"] if item["id"] == "layer_kael")
    layer["pose"] = None
    layer["rig"] = {
        "id": "rig",
        "name": "Rig",
        "bones": [
            {
                "id": "arm",
                "name": "Arm",
                "parentId": None,
                "limb": "left_arm",
                "action": None,
                "rotationDeg": 90,
            }
        ],
        "attachments": [],
    }

    def issues():
        return analyze_document(document)["issues"]

    assert not any(i["code"] == "CANON_PHYSICAL_CONFLICT" for i in issues())
    layer["rig"]["bones"][0]["action"] = "lift"
    conflict = next(i for i in issues() if i["code"] == "CANON_PHYSICAL_CONFLICT")
    assert conflict["subjectId"] == "arm"
    assert {"arm", "constraint_kael_left_arm", "event_injury", "scene_rooftop"} <= {
        e["entityId"] for e in conflict["evidence"]
    }
    layer["rig"]["bones"][0]["action"] = "dance"
    assert any(i["code"] == "physical.unsupported_rig_semantics" for i in issues())


def test_rig_injury_window_is_inclusive_at_start_and_exclusive_at_recovery():
    from app.linter import analyze_document

    doc = load_fixture()
    layer = next(item for item in doc["layers"] if item["id"] == "layer_kael")
    layer["pose"] = None
    layer["rig"] = {
        "id": "rig",
        "name": "Rig",
        "bones": [
            {
                "id": "arm",
                "name": "Arm",
                "parentId": None,
                "limb": "left_arm",
                "action": "lift",
                "rotationDeg": 0,
            }
        ],
        "attachments": [],
    }
    injury = doc["events"][0]
    scene = next(item for item in doc["scenes"] if item["id"] == "scene_rooftop")
    injury["order"] = 1
    doc["events"][1]["order"] = 0
    scene["eventIds"].append(injury["id"])
    # Event membership must be unambiguous.
    injury["sceneId"] = scene["id"]
    doc["scenes"][0]["eventIds"].remove(injury["id"])

    def conflicts():
        return [
            i for i in analyze_document(doc)["issues"] if i["code"] == "CANON_PHYSICAL_CONFLICT"
        ]

    assert len(conflicts()) == 1
    recovery = {
        "id": "recovery",
        "sceneId": scene["id"],
        "order": 2,
        "kind": "physical_recovery",
        "description": "Recovered",
    }
    doc["events"].append(recovery)
    scene["eventIds"].append("recovery")
    doc["characters"][0]["constraints"][0]["resolvedByEventId"] = "recovery"
    assert not conflicts()


def test_unknown_limb_is_reported_without_inventing_action():
    from app.linter import analyze_document

    doc = load_fixture()
    layer = next(item for item in doc["layers"] if item["id"] == "layer_kael")
    layer["pose"] = None
    layer["rig"] = {
        "id": "rig",
        "name": "Rig",
        "bones": [
            {
                "id": "arm",
                "name": "Arm",
                "parentId": None,
                "limb": "tail",
                "action": None,
                "rotationDeg": 90,
            }
        ],
        "attachments": [],
    }
    issues = analyze_document(doc)["issues"]
    assert any(i["code"] == "physical.unsupported_rig_semantics" for i in issues)
    assert not any(i["code"] == "CANON_PHYSICAL_CONFLICT" for i in issues)
