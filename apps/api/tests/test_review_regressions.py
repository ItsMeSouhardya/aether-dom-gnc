"""Real boundary regressions from the independent Task 03 review."""

import json
import os
import subprocess
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from test_repair_commands import BASE, command

from app import main, repository
from app.asset_inventory import inspect_assets
from app.contracts import load_fixture, validate_document
from app.linter import analyze_document


@pytest.mark.parametrize("field", ["pose", "description", "eventId", "actor", "reason"])
def test_non_scalar_unicode_is_rejected_before_any_commit(tmp_path: Path, field: str) -> None:
    payload = command(op="recordConstraintRecovery" if field in {"description", "eventId"}
                      else "setLayerPose")
    if field in {"pose", "description", "eventId"}:
        payload["args"][field] = "\ud800"
    elif field == "actor":
        payload["actor"]["id"] = "\udfff"
    else:
        payload["reason"] = "\udfff"
    with TestClient(main.create_app(tmp_path / "unicode.sqlite3"),
                    raise_server_exceptions=False) as client:
        before = client.get(BASE + "/document").json()
        response = client.post(BASE + "/commands", content=json.dumps(payload),
                               headers={"Content-Type": "application/json"})
        assert response.status_code == 422
        assert client.get(BASE + "/document").json() == before


def test_valid_supplementary_unicode_remains_portable(tmp_path: Path) -> None:
    with TestClient(main.create_app(tmp_path / "valid-unicode.sqlite3")) as client:
        response = client.post(BASE + "/commands", json=command(args={"pose": "standing 🦾"}))
        assert response.status_code == 200
        assert client.get(BASE + "/document").json()["document"]["layers"][1]["pose"] == (
            "standing 🦾"
        )


def test_document_text_keys_must_also_be_unicode_scalars() -> None:
    document = load_fixture()
    document["characters"][0]["traits"]["\ud800"] = 0.2
    assert validate_document(document)


def test_integral_float_orders_have_the_same_continuity_semantics() -> None:
    document = load_fixture()
    for event in document["events"]:
        event["order"] = float(event["order"])
    issues = analyze_document(document)["issues"]
    assert [issue["subjectId"] for issue in issues
            if issue["code"] == "CANON_PHYSICAL_CONFLICT"] == ["layer_kael"]
    assert not any(issue["code"] == "timeline.ambiguous" for issue in issues)


def test_raw_json_integral_recovery_order_resolves_injury(tmp_path: Path) -> None:
    with TestClient(main.create_app(tmp_path / "float-order.sqlite3")) as client:
        payload = command(op="recordConstraintRecovery")
        payload["args"]["order"] = 2.0
        response = client.post(BASE + "/commands", content=json.dumps(payload),
                               headers={"Content-Type": "application/json"})
        assert response.status_code == 200
        assert not any(issue["code"] in {"timeline.ambiguous", "CANON_PHYSICAL_CONFLICT"}
                       for issue in response.json()["analysis"]["issues"])


def test_redirected_assets_root_never_probes_private_files(tmp_path: Path) -> None:
    root = tmp_path / "workspace"
    root.mkdir()
    private = root / "private"
    private.mkdir()
    (private / "marker").write_text("private")
    link = root / "assets"
    if os.name == "nt":
        subprocess.run(["cmd", "/c", "mklink", "/J", str(link), str(private)],
                       capture_output=True, text=True, check=True)
    else:
        link.symlink_to(private, target_is_directory=True)
    assert inspect_assets({"assets": [{"id": "a", "uri": "assets/marker"}]}, root) == {
        "a": "unsafe",
    }


def test_recovery_and_undo_invalidate_other_appearances_at_changed_scene_time(
    tmp_path: Path, monkeypatch,
) -> None:
    document = load_fixture()
    document["events"].append({"id": "event_vance_injury", "sceneId": "scene_prologue",
                               "order": 2, "kind": "physical_change", "description": "Injury"})
    document["scenes"][0]["eventIds"].append("event_vance_injury")
    document["characters"][1]["constraints"].append({
        "id": "constraint_vance", "type": "limb_injury", "limb": "left_arm",
        "effectiveFromEventId": "event_vance_injury", "resolvedByEventId": None,
    })
    document["layers"][2]["pose"] = "lifting_with_left_arm"
    monkeypatch.setattr(repository, "load_fixture", lambda: document)
    with TestClient(main.create_app(tmp_path / "scene-time.sqlite3")) as client:
        payload = command(op="recordConstraintRecovery")
        payload["args"]["order"] = 3
        first = client.post(BASE + "/commands", json=payload).json()
        assert [issue["subjectId"] for issue in first["analysis"]["issues"]
                if issue["code"] == "CANON_PHYSICAL_CONFLICT"] == ["layer_vance"]
        assert "layer_vance" in first["analysis"]["invalidation"]["impactedEntityIds"]
        assert "layer_vance" in first["analysis"]["invalidation"]["evaluationOrder"]
        undone = client.post(BASE + "/commands", json=command(1, "undo")).json()
        assert [issue["subjectId"] for issue in undone["analysis"]["issues"]
                if issue["code"] == "CANON_PHYSICAL_CONFLICT"] == ["layer_kael"]
        assert "layer_vance" in undone["analysis"]["invalidation"]["impactedEntityIds"]
        assert "layer_vance" in undone["analysis"]["invalidation"]["evaluationOrder"]
