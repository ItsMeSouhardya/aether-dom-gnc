from app.rigs import evaluate_rig, validate_rig

RIG = {
    "id": "rig",
    "name": "Rig",
    "bones": [
        {
            "id": "root",
            "name": "Root",
            "parentId": None,
            "rest": {"x": 10, "y": 20, "rotationDeg": 0},
            "rotationDeg": 90,
            "limb": None,
            "action": None,
        },
        {
            "id": "child",
            "name": "Child",
            "parentId": "root",
            "rest": {"x": 5, "y": 0, "rotationDeg": 0},
            "rotationDeg": 0,
            "limb": None,
            "action": None,
        },
    ],
    "attachments": [{"id": "slot", "name": "Slot", "boneId": "child", "elementId": "part"}],
}


def test_clockwise_child_position():
    assert validate_rig(RIG) == []
    result = evaluate_rig(RIG, 0)
    assert abs(result["boneMatrices"]["child"][4] - 10) < 1e-9
    assert abs(result["boneMatrices"]["child"][5] - 25) < 1e-9


def test_shared_fixture_and_invalid_graph():
    import copy
    import json
    from pathlib import Path

    fixture = json.loads(
        (
            Path(__file__).resolve().parents[3] / "packages/schema/fixtures/rig-cases.json"
        ).read_text()
    )
    result = evaluate_rig(fixture["rig"], 0)
    assert all(
        abs(a - b) < 1e-9
        for a, b in zip(result["boneMatrices"]["child"], fixture["childMatrix"], strict=True)
    )
    invalid = copy.deepcopy(RIG)
    invalid["bones"][0]["parentId"] = "child"
    assert validate_rig(invalid)


def test_versions_and_ownership():
    import copy

    from app.contracts import load_fixture, validate_document

    doc = load_fixture()
    doc["schemaVersion"] = "0.5.0"
    layer = doc["layers"][0]
    layer.update(
        kind="character_sprite", characterId=doc["characters"][0]["id"], rig=copy.deepcopy(RIG)
    )
    assert validate_document(doc) == []
    doc["schemaVersion"] = "0.4.0"
    assert validate_document(doc)
    doc["schemaVersion"] = "0.5.0"
    layer["rig"]["bones"][0]["keyframes"] = [{"id": "frame", "timeMs": 99999999, "rotationDeg": 0}]
    assert validate_document(doc)


def test_bounds_interpolation_and_bindings():
    import copy
    import math

    from app.rigs import validate_rig_bindings

    value = copy.deepcopy(RIG)
    value["bones"][0]["rotationDeg"] = 180
    value["bones"][0]["keyframes"] = [{"id": "frame", "timeMs": 100, "rotationDeg": -180}]
    assert abs(evaluate_rig(value, 50)["boneMatrices"]["root"][0] - 1) < 1e-9
    assert evaluate_rig(value, -1) == evaluate_rig(value, 0)
    assert evaluate_rig(value, 200) == evaluate_rig(value, 100)
    assert abs(evaluate_rig(value, 50, False)["boneMatrices"]["root"][0] + 1) < 1e-9
    try:
        evaluate_rig(value, math.nan)
        raise AssertionError("Expected invalid time rejection")
    except ValueError:
        pass
    svg = {
        "root": {
            "tag": "svg",
            "id": "svg",
            "attributes": {},
            "children": [{"tag": "g", "id": "part", "children": []}],
        }
    }
    assert validate_rig_bindings(value, svg) == []
    svg["root"]["children"][0]["id"] = "wrong"
    assert validate_rig_bindings(value, svg)
    value["bones"][0]["rest"]["x"] = math.inf
    assert validate_rig(value)


def test_binding_rejects_malformed_tree_without_throwing():
    from app.rigs import validate_rig_bindings

    assert validate_rig_bindings(RIG, {"root": {"tag": "svg", "attributes": None}})


def test_shared_boundary_canonical_matrices_and_bindings():
    import copy
    import json
    from pathlib import Path

    from app.contracts import load_fixture, validate_document
    from app.rigs import validate_rig_bindings

    shared = json.loads(
        (
            Path(__file__).resolve().parents[3] / "packages/schema/fixtures/rig-cases.json"
        ).read_text()
    )
    for case in shared["boundaryCases"]:
        rig = copy.deepcopy(shared["rig"])
        if case["kind"] == "bones":
            while len(rig["bones"]) < case["count"]:
                bone = copy.deepcopy(rig["bones"][1])
                bone["id"] = f"bone{len(rig['bones'])}"
                rig["bones"].append(bone)
        if case["kind"] == "frames":
            rig["bones"][0]["keyframes"] = [
                {"id": f"frame{i}", "timeMs": i, "rotationDeg": 0}
                for i in range(min(case["count"], 128))
            ]
            if case["count"] > 128:
                rig["bones"][1]["keyframes"] = [{"id": "extra", "timeMs": 0, "rotationDeg": 0}]
        if case["kind"] == "duplicateId":
            rig["attachments"][0]["id"] = rig["bones"][0]["id"]
        if case["kind"] == "duplicateTime":
            rig["bones"][0]["keyframes"] = [
                {"id": "f1", "timeMs": 1, "rotationDeg": 0},
                {"id": "f2", "timeMs": 1, "rotationDeg": 0},
            ]
        assert (not validate_rig(rig)) == case["valid"], case
    for case in shared["documentCases"]:
        doc = load_fixture()
        rig = copy.deepcopy(shared["rig"])
        doc["schemaVersion"] = "0.4.0" if case["kind"] == "oldVersion" else "0.5.0"
        doc["layers"][0].update(
            kind="character_sprite", characterId=doc["characters"][0]["id"], rig=rig
        )
        if case["kind"] == "globalId":
            rig["id"] = doc["characters"][0]["id"]
        if case["kind"] in ("shotLimit", "pastShot"):
            rig["bones"][0]["keyframes"] = [
                {
                    "id": "frame",
                    "timeMs": doc["shots"][0]["durationMs"]
                    + (1 if case["kind"] == "pastShot" else 0),
                    "rotationDeg": 0,
                }
            ]
        assert (not validate_document(doc)) == case["valid"], case
    timed = copy.deepcopy(shared["rig"])
    timed["bones"][0]["rotationDeg"] = 0
    timed["bones"][0]["keyframes"] = [{"id": "f", "timeMs": 100, "rotationDeg": 90}]
    for case in shared["timingCases"]:
        result = evaluate_rig(timed, case["timeMs"])
        for actual, expected in (
            (result["boneMatrices"]["child"], case["bone"]),
            (result["attachmentMatrices"]["slot"], case["attachment"]),
        ):
            assert all(abs(a - b) < 1e-9 for a, b in zip(actual, expected, strict=True)), case
    for case in shared["bindingCases"]:
        svg = copy.deepcopy(shared["svg"])
        node = {"tag": "g", "id": "part", "attributes": {}, "text": "", "children": []}
        if case["kind"] == "nestedDuplicate":
            svg["root"]["children"][0]["children"].append(node)
        if case["kind"] == "nonGroupDuplicate":
            node["tag"] = "rect"
            svg["root"]["children"].append(node)
        assert (not validate_rig_bindings(shared["rig"], svg)) == case["valid"], case
