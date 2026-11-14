"""Human-reviewed rights edits reuse immutable canonical revisions and exact inverses."""

import base64
import copy
import json

import pytest
from fastapi.testclient import TestClient

from app.contracts import SCHEMA_ROOT
from app.main import create_app

BASE = "/api/v1/projects/proj_neon_shogun/branches/branch_main"
CASES = json.loads((SCHEMA_ROOT / "fixtures/asset-rights-cases.json").read_text())


def args(asset):
    p = CASES["provenance"]
    return {
        **{
            key: copy.deepcopy(p[key])
            for key in (
                "creator",
                "source",
                "license",
                "attribution",
                "permissions",
                "lineage",
                "consents",
            )
        },
        "rights": "project_original",
        "expectedAssetUri": asset["uri"],
        "expectedSourceUri": asset.get("sourceUri", asset["uri"]),
        "evidence": [{"label": "Creator statement", "text": CASES["blob"]["text"]}],
    }


def command(revision, asset, **updates):
    return {
        "commandId": f"rights_{revision}",
        "projectId": "proj_neon_shogun",
        "branchId": "branch_main",
        "expectedRevision": revision,
        "actor": {"kind": "human", "id": "creator"},
        "reason": "Review asset evidence",
        "op": "setAssetEvidence",
        "targetId": asset["id"],
        "args": args(asset),
        **updates,
    }


def fixture_media(tmp_path):
    from app.contracts import load_fixture

    player = json.loads((SCHEMA_ROOT / "fixtures/player-manifest.json").read_text(encoding="utf-8"))
    for asset in load_fixture()["assets"]:
        if asset["kind"] == "svg":
            path = tmp_path / asset["uri"]
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('<svg viewBox="0 0 10 10"><rect width="10"/></svg>')
        elif asset["kind"] == "audio":
            path = tmp_path / asset["uri"]
            path.parent.mkdir(parents=True, exist_ok=True)
            entry = next(item for item in player["assets"] if item["assetId"] == asset["id"])
            path.write_bytes(base64.b64decode(entry["dataBase64"]))


def test_evidence_preserves_v5_rig_and_exact_undo(tmp_path):
    from app.commands import apply_operation
    from app.contracts import load_fixture, validate_document
    from app.svg_assets import SvgAssetStore

    fixture_media(tmp_path)
    document = load_fixture()
    document["schemaVersion"] = "0.5.0"
    document["layers"][1]["rig"] = {
        "id": "rig", "name": "Rig",
        "bones": [{"id": "bone", "name": "Bone", "parentId": None,
                   "rest": {"x": 0, "y": 0, "rotationDeg": 0},
                   "rotationDeg": 0, "limb": None, "action": None}],
        "attachments": [{"id": "slot", "name": "Slot", "boneId": "bone",
                         "elementId": "part"}],
    }
    assert validate_document(document) == []
    before = copy.deepcopy(document)
    asset = document["assets"][0]
    result, _, inverse, _ = apply_operation(document, {
        "op": "setAssetEvidence", "targetId": asset["id"], "args": args(asset),
    }, SvgAssetStore(tmp_path))
    assert result["schemaVersion"] == "0.5.0"
    assert validate_document(result) == []
    assert apply_operation(result, inverse)[0] == before


def test_review_replay_conflict_noop_history_restart(tmp_path):
    fixture_media(tmp_path)
    db = tmp_path / "rights.db"
    with TestClient(create_app(db, tmp_path)) as client:
        before = client.get(BASE + "/document").json()["document"]
        asset = before["assets"][0]
        payload = command(0, asset)
        response = client.post(BASE + "/commands", json=payload)
        assert response.status_code == 200, response.text
        saved = response.json()
        assert saved["document"]["schemaVersion"] == "0.4.0"
        assert saved["receipt"]["changedEntityIds"] == [asset["id"]]
        assert client.post(BASE + "/commands", json=payload).json() == saved
        assert (
            client.post(BASE + "/commands", json=command(0, asset, commandId="stale")).status_code
            == 409
        )
        noop = client.post(BASE + "/commands", json=command(1, asset))
        assert noop.status_code == 422 and noop.json()["detail"]["code"] == "NO_CHANGE"
        ledger = client.get(BASE + f"/assets/{asset['id']}/ledger?revision=1")
        assert ledger.status_code == 200, ledger.text
        assert ledger.headers["cache-control"] == "no-store"
        assert ledger.json()["evidence"] == [CASES["blob"]]
        for revision, op in [(1, "undo"), (2, "redo")]:
            history = {
                key: value
                for key, value in command(revision, asset, op=op).items()
                if key not in {"targetId", "args"}
            }
            result = client.post(BASE + "/commands", json=history)
            assert result.status_code == 200, result.text
            restored = result.json()["document"]
            if op == "undo":
                assert restored["schemaVersion"] == before["schemaVersion"]
                assert restored["assets"] == before["assets"]
            else:
                assert restored["assets"] == saved["document"]["assets"]
        tension = command(
            3, asset, op="setShotTension", targetId="shot_rooftop", args={"tension": 0.5}
        )
        response = client.post(BASE + "/commands", json=tension)
        assert response.status_code == 200, response.text
        assert response.json()["document"]["schemaVersion"] == "0.4.0"
    with TestClient(create_app(db, tmp_path)) as client:
        assert (
            client.get(BASE + "/document").json()["document"]["assets"]
            == saved["document"]["assets"]
        )
        assert client.get(BASE + f"/assets/{asset['id']}/ledger?revision=1").json() == ledger.json()


@pytest.mark.parametrize(
    "raw",
    ['{"op":"undo","op":"redo"}', '{"n":NaN}', "[" * 40 + "0" + "]" * 40, " " * (512 * 1024 + 1)],
)
def test_command_json_is_strict_and_bounded(tmp_path, raw):
    with TestClient(create_app(tmp_path / "strict.db", tmp_path)) as client:
        response = client.post(
            BASE + "/commands", content=raw, headers={"content-type": "application/json"}
        )
        assert response.status_code == 422
        assert response.json()["detail"]["code"] == "INVALID_COMMAND"
        assert client.get(BASE + "/document").json()["document"]["project"]["revision"] == 0


@pytest.mark.parametrize(
    "query", ["", "revision=-1", "revision=01", "revision=0&revision=0", "revision=0&extra=x"]
)
def test_ledger_requires_exact_revision_query(tmp_path, query):
    with TestClient(create_app(tmp_path / "query.db", tmp_path)) as client:
        response = client.get(BASE + "/assets/asset_kael/ledger?" + query)
        assert response.status_code == 422


def test_svg_derivative_is_stale_until_reviewed(tmp_path):
    fixture_media(tmp_path)
    with TestClient(create_app(tmp_path / "stale.db", tmp_path)) as client:
        asset = client.get(BASE + "/document").json()["document"]["assets"][0]
        first = client.post(BASE + "/commands", json=command(0, asset))
        assert first.status_code == 200, first.text
        edit = command(
            1,
            asset,
            op="editSvgElement",
            args={"elementId": "svg-node-2", "attributes": {"width": "9"}},
        )
        response = client.post(BASE + "/commands", json=edit)
        assert response.status_code == 200, response.text
        changed = response.json()["document"]["assets"][0]
        assert changed["provenance"] == first.json()["document"]["assets"][0]["provenance"]
        ledger = client.get(BASE + f"/assets/{asset['id']}/ledger?revision=2").json()
        assert "stale" in ledger["error"].lower()
        assert ledger["evidence"] == [CASES["blob"]]
        fixed = client.post(BASE + "/commands", json=command(2, changed))
        assert fixed.status_code == 200, fixed.text
        p = fixed.json()["document"]["assets"][0]["provenance"]
        assert p["original"] == first.json()["document"]["assets"][0]["provenance"]["original"]
        assert (
            p["lineage"]["parentSha256"]
            == first.json()["document"]["assets"][0]["provenance"]["current"]["sha256"]
        )


@pytest.mark.parametrize("which", ["original", "current"])
def test_review_cannot_rebind_changed_bytes_at_same_uri(tmp_path, which):
    fixture_media(tmp_path)
    with TestClient(create_app(tmp_path / "corrupt.db", tmp_path)) as client:
        asset = client.get(BASE + "/document").json()["document"]["assets"][0]
        saved = client.post(BASE + "/commands", json=command(0, asset))
        assert saved.status_code == 200, saved.text
        p = saved.json()["document"]["assets"][0]["provenance"]
        (tmp_path / p[which]["uri"]).write_text('<svg viewBox="0 0 10 10"><rect width="9"/></svg>')
        response = client.post(BASE + "/commands", json=command(1, asset))
        assert response.status_code == 422
        assert client.get(BASE + "/document").json()["document"]["project"]["revision"] == 1


def test_historical_export_dedup_fork_and_evidence_recovery(tmp_path):
    fixture_media(tmp_path)
    with TestClient(create_app(tmp_path / "export.db", tmp_path)) as client:
        document = client.get(BASE + "/document").json()["document"]
        assert client.get(BASE + "/player-manifest?use=public_distribution").status_code == 422
        for revision, asset in enumerate(document["assets"]):
            saved = client.post(BASE + "/commands", json=command(revision, asset))
            assert saved.status_code == 200, saved.text
        revision = len(document["assets"])
        manifest = client.get(
            BASE + f"/player-manifest?revision={revision}&use=public_distribution"
        )
        assert manifest.status_code == 200, manifest.text
        assert manifest.json()["manifestVersion"] == "1.1.0"
        assert manifest.json()["exportUse"] == "public_distribution"
        assert manifest.json()["evidence"] == [CASES["blob"]]
        first = document["assets"][0]
        payload = command(revision, first)
        payload["args"]["evidence"][0]["text"] = "A corrected statement covering all uses."
        saved = client.post(BASE + "/commands", json=payload)
        assert saved.status_code == 200, saved.text
        assert (
            client.get(
                BASE + f"/player-manifest?revision={revision}&use=public_distribution"
            ).json()
            == manifest.json()
        )
        new_manifest = client.get(BASE + "/player-manifest?use=commercial_pack")
        assert new_manifest.status_code == 200, new_manifest.text
        assert len(new_manifest.json()["evidence"]) == 2
        fork = {
            "commandId": "fork_rights",
            "sourceBranchId": "branch_main",
            "op": "forkBranch",
            "projectId": "proj_neon_shogun",
            "expectedRevision": revision + 1,
            "newBranchId": "branch_rights",
            "name": "Rights copy",
            "actor": {"kind": "human", "id": "creator"},
            "reason": "Review independent branch",
        }
        forked = client.post(BASE.rsplit("/", 1)[0], json=fork)
        assert forked.status_code == 200, forked.text
        fork_base = BASE.replace("branch_main", "branch_rights")
        assert (
            client.get(fork_base + "/player-manifest?use=commercial_pack").json()["evidence"]
            == new_manifest.json()["evidence"]
        )
        # Missing prior evidence is recoverable by submitting newly authored proof.
        (tmp_path / CASES["blob"]["uri"]).unlink()
        ledger = client.get(
            BASE + f"/assets/{document['assets'][1]['id']}/ledger?revision={revision + 1}"
        )
        assert ledger.status_code == 200 and ledger.json()["error"]
        assert client.get(BASE + "/player-manifest").status_code == 422
        payload = command(revision + 1, document["assets"][1])
        payload["args"]["evidence"][0]["text"] = "Replacement proof."
        assert client.post(BASE + "/commands", json=payload).status_code == 200


def test_duplicate_keys_in_otherwise_valid_command_are_rejected(tmp_path):
    with TestClient(create_app(tmp_path / "duplicate.db", tmp_path)) as client:
        payload = {
            "commandId": "duplicate",
            "projectId": "proj_neon_shogun",
            "branchId": "branch_main",
            "expectedRevision": 0,
            "actor": {"kind": "human", "id": "creator"},
            "reason": "Frame",
            "op": "setLayerTransform",
            "targetId": "layer_kael",
            "args": {"x": 1},
        }
        raw = json.dumps(payload).replace('"x": 1', '"x": 2, "x": 1')
        response = client.post(
            BASE + "/commands", content=raw, headers={"content-type": "application/json"}
        )
        assert response.status_code == 422
        assert client.get(BASE + "/document").json()["document"]["project"]["revision"] == 0


def test_incomplete_claims_are_diagnosed_without_blocking_editing(tmp_path):
    fixture_media(tmp_path)
    with TestClient(create_app(tmp_path / "diagnostics.db", tmp_path)) as client:
        asset = client.get(BASE + "/document").json()["document"]["assets"][0]
        payload = command(0, asset)
        payload["args"]["permissions"]["public_distribution"] = "unknown"
        response = client.post(BASE + "/commands", json=payload)
        assert response.status_code == 200, response.text
        issues = response.json()["analysis"]["issues"]
        assert any(
            issue["subjectId"] == asset["id"] and issue["code"] == "asset.use_blocked"
            for issue in issues
        )


def test_export_denial_identifies_asset_and_intended_use(tmp_path):
    fixture_media(tmp_path)
    with TestClient(create_app(tmp_path / "blocked.db", tmp_path)) as client:
        asset = client.get(BASE + "/document").json()["document"]["assets"][0]
        payload = command(0, asset)
        payload["args"]["permissions"]["private_preview"] = "denied"
        payload["args"]["attribution"] = "A" * 2000
        assert client.post(BASE + "/commands", json=payload).status_code == 200
        response = client.get(BASE + "/player-manifest?use=private_preview")
        assert response.status_code == 422
        detail = response.json()["detail"]
        assert detail["assetIds"] == [asset["id"]]
        assert detail["exportUse"] == "private_preview"
        assert detail["decisions"][0]["allowed"] is False
        assert len(response.content) < 16 * 1024


@pytest.mark.parametrize(
    "media",
    [
        b"\xff",
        (
            '<svg viewBox="0 0 10 10">' + "<g>" * 14 + '<rect width="1"/>' + "</g>" * 14 + "</svg>"
        ).encode(),
    ],
)
def test_unreadable_media_save_is_typed_and_preserves_canon_and_files(tmp_path, media):
    fixture_media(tmp_path)
    with TestClient(
        create_app(tmp_path / "bad-media.db", tmp_path), raise_server_exceptions=False
    ) as client:
        before = client.get(BASE + "/document").json()["document"]
        asset = before["assets"][0]
        (tmp_path / asset["uri"]).write_bytes(media)
        files = {
            p.relative_to(tmp_path): p.read_bytes()
            for p in (tmp_path / "assets").rglob("*")
            if p.is_file()
        }
        response = client.post(BASE + "/commands", json=command(0, asset))
        assert response.status_code == 422, response.text
        assert response.json()["detail"]["code"] == "INVALID_ASSET_EVIDENCE"
        assert response.json()["detail"]["assetId"] == asset["id"]
        assert len(response.content) < 4096
        assert client.get(BASE + "/document").json()["document"] == before
        assert {
            p.relative_to(tmp_path): p.read_bytes()
            for p in (tmp_path / "assets").rglob("*")
            if p.is_file()
        } == files
