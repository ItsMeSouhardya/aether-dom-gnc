import base64
import copy
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import app.player_manifest as player_boundary
from app.commands import CommandError
from app.contracts import SCHEMA_ROOT
from app.main import create_app
from app.player_manifest import build_player_manifest, validate_player_manifest
from app.svg_assets import SvgAssetStore

BASE = "/api/v1/projects/proj_neon_shogun/branches/branch_main/player-manifest"

CASES = json.loads((SCHEMA_ROOT / "fixtures/player-manifest-cases.json").read_text())


@pytest.mark.parametrize("case", CASES, ids=[case["name"] for case in CASES])
def test_shared_manifest_cases(case):
    value = json.loads((SCHEMA_ROOT / "fixtures/player-manifest.json").read_text(encoding="utf-8"))
    if case["path"]:
        parent = value
        for key in case["path"][:-1]:
            parent = parent[key]
        parent[case["path"][-1]] = copy.deepcopy(case["value"])
    assert (not validate_player_manifest(value)) == case["valid"]


def test_manifest_portable_revision_bound_download_and_readonly(tmp_path: Path):
    database = tmp_path / "player.sqlite3"
    with TestClient(create_app(database)) as client:
        before = database.read_bytes()
        response = client.get(BASE + "?revision=0")
        assert response.status_code == 200, response.text
        manifest = response.json()
        assert manifest["manifestVersion"] == "1.0.0"
        assert manifest["document"]["project"]["revision"] == 0
        assert len(manifest["assets"]) == 7
        assert all("svg" in entry or "dataBase64" in entry for entry in manifest["assets"])
        download = client.get(BASE + "?revision=0&download=1")
        assert download.json() == manifest
        assert (
            download.headers["content-disposition"]
            == 'attachment; filename="aether-dom-r0.cdom.json"'
        )
        assert download.headers["cache-control"] == "no-store"
        assert database.read_bytes() == before
        assert client.get(BASE + "?revision=999").status_code == 404
        payload = {
            "commandId": "portrait",
            "projectId": "proj_neon_shogun",
            "branchId": "branch_main",
            "expectedRevision": 0,
            "actor": {"kind": "human", "id": "creator"},
            "reason": "Portrait",
            "op": "setShotLayoutOverride",
            "targetId": "shot_rooftop",
            "args": {"aspectRatio": "9:16", "layerTransforms": None},
        }
        assert (
            client.post(BASE.replace("/player-manifest", "/commands"), json=payload).status_code
            == 200
        )
        assert client.get(BASE + "?revision=0").json() == manifest
        assert client.get(BASE).json()["document"]["project"]["revision"] == 1


def test_manifest_missing_media_fails_atomically(tmp_path: Path):
    with TestClient(create_app(tmp_path / "player.sqlite3", asset_root=tmp_path)) as client:
        response = client.get(BASE)
        assert response.status_code == 422
        assert response.json()["detail"]["code"] == "INVALID_PLAYER_MANIFEST"


@pytest.mark.parametrize(
    "query",
    [
        "revision=-1",
        "revision=1.0",
        "revision=01",
        "revision=9007199254740992",
        "revision=0&revision=0",
        "download=true",
        "extra=1",
    ],
)
def test_manifest_strict_query(tmp_path: Path, query):
    with TestClient(create_app(tmp_path / "player.sqlite3")) as client:
        assert client.get(BASE + "?" + query).status_code == 422


def media_root(tmp_path):
    fixture = json.loads(
        (SCHEMA_ROOT / "fixtures/player-manifest.json").read_text(encoding="utf-8")
    )
    for asset in fixture["document"]["assets"]:
        path = tmp_path / asset["uri"]
        path.parent.mkdir(parents=True, exist_ok=True)
        if asset["kind"] == "svg":
            path.write_text('<svg viewBox="0 0 100 100"><rect width="100" height="100"/></svg>')
        else:
            audio = next(item for item in fixture["assets"] if item["assetId"] == asset["id"])
            path.write_bytes(base64.b64decode(audio["dataBase64"]))
    return fixture["document"]


@pytest.mark.parametrize(
    "failure", ["rights", "path", "unsupported", "references", "wav", "oversize"]
)
def test_manifest_media_failures_are_actionable_and_atomic(tmp_path: Path, failure):
    document = media_root(tmp_path)
    if failure == "rights":
        document["assets"][0]["rights"] = "unknown"
    elif failure == "path":
        document["assets"][0]["uri"] = "../outside.svg"
    elif failure == "unsupported":
        document["layers"][0]["kind"] = "raster_plane"
        document["assets"][0]["kind"] = "raster"
    elif failure == "references":
        document["shots"][0]["layerIds"].append("missing")
    elif failure == "wav":
        (tmp_path / document["assets"][4]["uri"]).write_bytes(b"not wave")
    else:
        (tmp_path / document["assets"][4]["uri"]).write_bytes(b"0" * (8 * 1024 * 1024 + 1))
    before = copy.deepcopy(document)
    with pytest.raises(CommandError) as error:
        build_player_manifest(document, tmp_path, SvgAssetStore(tmp_path))
    assert error.value.status == 422
    assert error.value.detail["code"] == "INVALID_PLAYER_MANIFEST"
    assert document == before


def test_manifest_unsafe_trees_and_nonportable_values():
    cycle = {}
    cycle["self"] = cycle
    assert validate_player_manifest(cycle)
    deep = {}
    for _ in range(40):
        deep = {"child": deep}
    assert validate_player_manifest(deep)
    for value in [float("nan"), float("inf"), "\ud800", 10**1000]:
        assert validate_player_manifest({"value": value})


def test_manifest_assembly_stops_at_cumulative_bound(tmp_path: Path, monkeypatch):
    document = media_root(tmp_path)
    monkeypatch.setattr(player_boundary, "MAX_BYTES", 15000)
    calls = []

    def oversized_audio(root, uri):
        calls.append(uri)
        return b"x" * 20000

    monkeypatch.setattr(player_boundary, "read_audio", oversized_audio)
    with pytest.raises(CommandError, match="32 MiB"):
        build_player_manifest(document, tmp_path, SvgAssetStore(tmp_path))
    assert len(calls) == 1
