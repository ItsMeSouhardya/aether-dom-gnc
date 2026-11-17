import copy

from app.contracts import load_fixture, validate_document


def test_v6_hotspot_contract_and_old_version_rejection():
    doc = load_fixture()
    hotspot = {
        "id": "hotspot-1",
        "label": "Lore",
        "targetKind": "character",
        "targetId": doc["characters"][0]["id"],
        "positions": {"16:9": {"x": 0, "y": 1}, "9:16": {"x": 1, "y": 0}},
    }
    doc["schemaVersion"] = "0.6.0"
    doc["shots"][0]["hotspots"] = [hotspot]
    assert validate_document(doc) == []
    doc["schemaVersion"] = "0.5.0"
    assert validate_document(doc)
    doc["schemaVersion"] = "0.6.0"
    for bad in [float("nan"), -0.01, 1.01]:
        invalid = copy.deepcopy(doc)
        invalid["shots"][0]["hotspots"][0]["positions"]["16:9"]["x"] = bad
        assert validate_document(invalid)
    invalid = copy.deepcopy(doc)
    invalid["shots"][0]["hotspots"][0]["id"] = doc["characters"][0]["id"]
    assert validate_document(invalid)
    invalid = copy.deepcopy(doc)
    invalid["shots"][0]["hotspots"] = [dict(hotspot, id=f"h{i}") for i in range(9)]
    assert validate_document(invalid)


def test_hotspot_commands_create_delete_and_restore_exact_version():
    import pytest

    from app.commands import CommandError, apply_operation

    doc = load_fixture()
    hotspot = {
        "id": "hotspot-1",
        "label": "Lore",
        "targetKind": "character",
        "targetId": doc["characters"][0]["id"],
        "positions": {"16:9": {"x": 0, "y": 1}, "9:16": {"x": 1, "y": 0}},
    }
    op = {"op": "setLoreHotspot", "targetId": doc["shots"][0]["id"], "args": {"hotspot": hotspot}}
    saved, forward, inverse, changed = apply_operation(doc, op)
    assert saved["schemaVersion"] == "0.6.0"
    assert apply_operation(saved, inverse)[0] == doc
    assert apply_operation(doc, forward)[0] == saved
    with pytest.raises(CommandError):
        apply_operation(saved, op)
    bad = copy.deepcopy(op)
    bad["args"]["hotspot"]["targetId"] = "missing"
    with pytest.raises(CommandError):
        apply_operation(doc, bad)
    deleted = apply_operation(
        saved,
        {
            "op": "deleteLoreHotspot",
            "targetId": op["targetId"],
            "args": {"hotspotId": hotspot["id"]},
        },
    )[0]
    assert deleted["shots"][0].get("hotspots", []) == []
    assert hotspot["id"] in changed


def test_hotspot_dependencies_and_soft_missing_target():
    from app.dependency_graph import build_graph, entity_records
    from app.linter import analyze_document

    doc = load_fixture()
    doc["schemaVersion"] = "0.6.0"
    target = doc["characters"][0]["id"]
    shot = doc["shots"][0]
    shot["hotspots"] = [
        {
            "id": "spot",
            "label": "Lore",
            "targetKind": "character",
            "targetId": target,
            "positions": {"16:9": {"x": 0, "y": 1}, "9:16": {"x": 1, "y": 0}},
        }
    ]
    graph = build_graph(doc)
    assert (target, "spot", "lore_target") in graph.edges
    assert ("spot", shot["id"], "aggregates") in graph.edges
    assert any(record[3] == "/shots/0/hotspots/0" for record in entity_records(doc))
    assert not graph.cycle_node_ids
    shot["hotspots"][0]["targetId"] = "missing"
    assert validate_document(doc) == []
    assert any(
        i["code"] == "reference.missing" and i["subjectId"] == "spot"
        for i in analyze_document(doc)["issues"]
    )


def test_http_hotspot_round_trip(tmp_path):
    from fastapi.testclient import TestClient
    from test_commands import app_for

    with TestClient(app_for(tmp_path / "hotspot.sqlite3")) as client:
        _http_round_trip(client)


def _http_round_trip(client):
    from test_commands import BASE, command, snapshot

    doc = snapshot(client)["document"]
    h = {
        "id": "spot",
        "label": "Lore",
        "targetKind": "character",
        "targetId": doc["characters"][0]["id"],
        "positions": {"16:9": {"x": 0, "y": 1}, "9:16": {"x": 1, "y": 0}},
    }
    payload = command(0, "setLoreHotspot", targetId=doc["shots"][0]["id"], args={"hotspot": h})
    response = client.post(BASE + "/commands", json=payload)
    assert response.status_code == 200, response.text
    assert snapshot(client)["document"]["shots"][0]["hotspots"] == [h]
    stale = client.post(
        BASE + "/commands",
        json=command(
            0, "deleteLoreHotspot", targetId=doc["shots"][0]["id"], args={"hotspotId": "spot"}
        ),
    )
    assert stale.status_code == 409
    manifest = client.get(BASE + "/player-manifest")
    assert manifest.status_code == 200
    assert manifest.json()["document"]["shots"][0]["hotspots"] == [h]
    undo = client.post(BASE + "/commands", json=command(1, "undo"))
    assert undo.status_code == 200
    assert undo.json()["document"]["schemaVersion"] == "0.1.0"
    redo = client.post(BASE + "/commands", json=command(2, "redo"))
    assert redo.status_code == 200
    assert redo.json()["document"]["shots"][0]["hotspots"] == [h]


def test_hotspot_validator_rejects_nonportable_scalars_and_reserved_ids():
    from app.hotspots import validate_lore_hotspot

    h = {
        "id": "spot",
        "label": "Lore",
        "targetKind": "event",
        "targetId": "event",
        "positions": {"16:9": {"x": 0, "y": 1}, "9:16": {"x": 1, "y": 0}},
    }
    assert validate_lore_hotspot(h) == []
    for key, value in [
        ("id", "constructor"),
        ("id", "id\n"),
        ("label", "\ufeff\u0085"),
        ("label", "\ud800"),
    ]:
        assert validate_lore_hotspot(dict(h, **{key: value}))


def test_older_adapters_preserve_v6_and_exact_inverse(tmp_path):
    from test_asset_rights_api import args, fixture_media
    from test_rigs import RIG

    from app.commands import apply_operation
    from app.svg_assets import SvgAssetStore

    doc = load_fixture()
    doc["schemaVersion"] = "0.6.0"
    doc["shots"][0]["hotspots"] = [
        {
            "id": "spot",
            "label": "Lore",
            "targetKind": "character",
            "targetId": doc["characters"][0]["id"],
            "positions": {"16:9": {"x": 0, "y": 1}, "9:16": {"x": 1, "y": 0}},
        }
    ]
    doc["layers"][1]["rig"] = copy.deepcopy(RIG)
    fixture_media(tmp_path)
    asset = doc["assets"][0]
    operations = [
        {"op": "setRigBonePose", "targetId": "root", "args": {"rotationDeg": 5, "action": None}},
        {"op": "setShotTension", "targetId": doc["shots"][0]["id"], "args": {"tension": 0.4}},
        {
            "op": "setShotLayoutOverride",
            "targetId": doc["shots"][0]["id"],
            "args": {"aspectRatio": "9:16", "layerTransforms": None},
        },
        {"op": "setAssetEvidence", "targetId": asset["id"], "args": args(asset)},
    ]
    for op in operations:
        saved, _, inverse, _ = apply_operation(doc, op, SvgAssetStore(tmp_path))
        assert saved["schemaVersion"] == "0.6.0"
        assert saved["shots"][0]["hotspots"] == doc["shots"][0]["hotspots"]
        assert apply_operation(saved, inverse)[0] == doc


def test_hotspot_persists_through_restart_fork_and_replay(tmp_path):
    from fastapi.testclient import TestClient
    from test_branches import BASE as PROJECT_BASE
    from test_branches import fork
    from test_commands import BASE, app_for, command, snapshot

    path = tmp_path / "restart.sqlite3"
    with TestClient(app_for(path)) as client:
        doc = snapshot(client)["document"]
        h = {
            "id": "spot",
            "label": "Lore",
            "targetKind": "event",
            "targetId": doc["events"][0]["id"],
            "positions": {"16:9": {"x": 0, "y": 1}, "9:16": {"x": 1, "y": 0}},
        }
        payload = command(0, "setLoreHotspot", targetId=doc["shots"][0]["id"], args={"hotspot": h})
        saved = client.post(BASE + "/commands", json=payload)
        assert saved.status_code == 200
        replay = client.post(BASE + "/commands", json=payload)
        assert replay.status_code == 200
        assert replay.json() == saved.json()
        assert client.post(PROJECT_BASE + "/branches", json=fork(revision=1)).status_code == 200
    with TestClient(app_for(path)) as client:
        assert snapshot(client)["document"]["shots"][0]["hotspots"] == [h]
        child = client.get(PROJECT_BASE + "/branches/branch_alt/document").json()
        assert child["document"]["shots"][0]["hotspots"] == [h]


def test_shared_hotspot_cases():
    import json
    from pathlib import Path

    from app.hotspots import validate_lore_hotspot

    data = json.loads(
        (
            Path(__file__).resolve().parents[3] / "packages/schema/fixtures/hotspot-cases.json"
        ).read_text(encoding="utf-8-sig")
    )
    for case in data["cases"]:
        hotspot = dict(data["hotspot"], **{case["field"]: case["value"]})
        assert (not validate_lore_hotspot(hotspot)) == case["valid"]


def test_removed_hotspot_invalidation_uses_previous_graph():
    from app.dependency_graph import build_graph

    doc = load_fixture()
    doc["schemaVersion"] = "0.6.0"
    shot = doc["shots"][0]
    target = doc["characters"][0]["id"]
    shot["hotspots"] = [
        {
            "id": "spot",
            "label": "Lore",
            "targetKind": "character",
            "targetId": target,
            "positions": {"16:9": {"x": 0, "y": 1}, "9:16": {"x": 1, "y": 0}},
        }
    ]
    previous = build_graph(doc)
    del shot["hotspots"]
    current = build_graph(doc)
    impact = current.invalidate([target, "spot"], previous)
    assert shot["id"] in impact["impactedEntityIds"]
    assert not current.cycle_node_ids


def test_update_and_delete_snapshot_inverses_preserve_exact_documents():
    from app.commands import apply_operation

    original = load_fixture()
    shot_id = original["shots"][0]["id"]
    hotspot = {
        "id": "spot",
        "label": "Original",
        "targetKind": "character",
        "targetId": original["characters"][0]["id"],
        "positions": {"16:9": {"x": 0, "y": 1}, "9:16": {"x": 1, "y": 0}},
    }
    create = {"op": "setLoreHotspot", "targetId": shot_id, "args": {"hotspot": hotspot}}
    created, _, create_inverse, _ = apply_operation(original, create)
    assert "hotspots" not in original["shots"][0]
    assert apply_operation(created, create_inverse)[0] == original
    assert original["schemaVersion"] == "0.1.0"
    updated_hotspot = {
        **hotspot,
        "label": "Changed",
        "targetKind": "event",
        "targetId": original["events"][0]["id"],
        "positions": {"16:9": {"x": 0.25, "y": 0.5}, "9:16": {"x": 0.75, "y": 1}},
    }
    updated, forward, inverse, changed = apply_operation(
        created, {"op": "setLoreHotspot", "targetId": shot_id, "args": {"hotspot": updated_hotspot}}
    )
    expected_updated = copy.deepcopy(created)
    expected_updated["shots"][0]["hotspots"] = [updated_hotspot]
    assert updated == expected_updated
    assert apply_operation(updated, inverse)[0] == created
    assert apply_operation(created, forward)[0] == updated
    assert set(changed) >= {shot_id, "spot", hotspot["targetId"], updated_hotspot["targetId"]}
    deleted, forward, inverse, _ = apply_operation(
        updated, {"op": "deleteLoreHotspot", "targetId": shot_id, "args": {"hotspotId": "spot"}}
    )
    expected_deleted = copy.deepcopy(updated)
    del expected_deleted["shots"][0]["hotspots"]
    assert deleted == expected_deleted
    assert apply_operation(deleted, inverse)[0] == updated
    assert apply_operation(updated, forward)[0] == deleted
    empty = copy.deepcopy(original)
    empty["schemaVersion"] = "0.6.0"
    empty["shots"][0]["hotspots"] = []
    created_from_empty, _, inverse, _ = apply_operation(empty, create)
    assert apply_operation(created_from_empty, inverse)[0] == empty
    assert "hotspots" in apply_operation(created_from_empty, inverse)[0]["shots"][0]


def test_public_commands_reject_foreign_collision_and_ninth_without_mutation(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient
    from test_commands import BASE, app_for, command, snapshot

    import app.repository as repository_module

    seed = load_fixture()
    second = copy.deepcopy(seed["shots"][0])
    second.update(id="shot_second", layerIds=[], audioTrackIds=[], layoutOverrides={})
    seed["shots"].append(second)
    seed["scenes"][0]["shotIds"].append(second["id"])
    assert validate_document(seed) == []
    monkeypatch.setattr(repository_module, "load_fixture", lambda: copy.deepcopy(seed))
    with TestClient(app_for(tmp_path / "matrix.sqlite3")) as client:
        first = seed["shots"][0]["id"]
        hotspot = {
            "id": "spot-0",
            "label": "Lore",
            "targetKind": "character",
            "targetId": seed["characters"][0]["id"],
            "positions": {"16:9": {"x": 0, "y": 1}, "9:16": {"x": 1, "y": 0}},
        }
        for index in range(8):
            value = {**hotspot, "id": f"spot-{index}"}
            response = client.post(
                BASE + "/commands",
                json=command(index, "setLoreHotspot", targetId=first, args={"hotspot": value}),
            )
            assert response.status_code == 200, response.text
        before = snapshot(client)
        invalid = [
            command(
                8,
                "setLoreHotspot",
                commandId="foreign-set",
                targetId=second["id"],
                args={"hotspot": hotspot},
            ),
            command(
                8,
                "deleteLoreHotspot",
                commandId="foreign-delete",
                targetId=second["id"],
                args={"hotspotId": hotspot["id"]},
            ),
            command(
                8,
                "setLoreHotspot",
                commandId="global-collision",
                targetId=second["id"],
                args={"hotspot": {**hotspot, "id": seed["characters"][0]["id"]}},
            ),
            command(
                8,
                "setLoreHotspot",
                commandId="ninth",
                targetId=first,
                args={"hotspot": {**hotspot, "id": "spot-8"}},
            ),
        ]
        for payload, status, code in zip(
            invalid,
            (422, 404, 422, 422),
            ("ENTITY_ID_USED", "TARGET_NOT_FOUND", "ENTITY_ID_USED", "INVALID_DOCUMENT"),
            strict=True,
        ):
            response = client.post(BASE + "/commands", json=payload)
            assert response.status_code == status, response.text
            assert response.json()["detail"]["code"] == code
            assert snapshot(client) == before


def test_public_update_delete_and_undo_preserve_exact_authored_documents(tmp_path):
    from fastapi.testclient import TestClient
    from test_commands import BASE, app_for, authored, command, snapshot

    with TestClient(app_for(tmp_path / "update-delete.sqlite3")) as client:
        original = snapshot(client)["document"]
        shot = original["shots"][0]["id"]
        hotspot = {
            "id": "spot",
            "label": "Before",
            "targetKind": "character",
            "targetId": original["characters"][0]["id"],
            "positions": {"16:9": {"x": 0, "y": 1}, "9:16": {"x": 1, "y": 0}},
        }
        create = client.post(
            BASE + "/commands",
            json=command(0, "setLoreHotspot", targetId=shot, args={"hotspot": hotspot}),
        )
        assert create.status_code == 200, create.text
        created = create.json()["document"]
        revised = {
            **hotspot,
            "label": "After",
            "targetKind": "event",
            "targetId": original["events"][0]["id"],
        }
        update = client.post(
            BASE + "/commands",
            json=command(1, "setLoreHotspot", targetId=shot, args={"hotspot": revised}),
        )
        assert update.status_code == 200, update.text
        expected = copy.deepcopy(created)
        expected["shots"][0]["hotspots"] = [revised]
        assert authored(update.json()["document"]) == authored(expected)
        deletion = client.post(
            BASE + "/commands",
            json=command(2, "deleteLoreHotspot", targetId=shot, args={"hotspotId": "spot"}),
        )
        assert deletion.status_code == 200, deletion.text
        deleted = copy.deepcopy(expected)
        del deleted["shots"][0]["hotspots"]
        assert authored(deletion.json()["document"]) == authored(deleted)
        undo_delete = client.post(BASE + "/commands", json=command(3, "undo"))
        assert undo_delete.status_code == 200
        assert authored(undo_delete.json()["document"]) == authored(expected)
        undo_update = client.post(BASE + "/commands", json=command(4, "undo"))
        assert undo_update.status_code == 200
        assert authored(undo_update.json()["document"]) == authored(created)
        undo_create = client.post(BASE + "/commands", json=command(5, "undo"))
        assert undo_create.status_code == 200
        assert authored(undo_create.json()["document"]) == authored(original)
        assert "hotspots" not in undo_create.json()["document"]["shots"][0]
