import copy
import json

import pytest

from app.contracts import SCHEMA_ROOT
from app.player_manifest import validate_player_manifest

DIRECTORY = SCHEMA_ROOT / "fixtures"
CASES = json.loads((DIRECTORY / "player-rights-manifest-cases.json").read_text())


@pytest.mark.parametrize("case", CASES, ids=lambda case: case["name"])
def test_shared_recorded_rights_manifest(case):
    value = json.loads((DIRECTORY / "player-rights-manifest.json").read_text())
    updates = case["updates"] + ([case] if case["path"] else [])
    for update in updates:
        parent = value
        for key in update["path"][:-1]:
            parent = parent[key]
        parent[update["path"][-1]] = copy.deepcopy(update["value"])
    assert (not validate_player_manifest(value)) == case["valid"]


def test_old_wrapper_does_not_bypass_recorded_policy():
    value = json.loads((DIRECTORY / "player-rights-manifest.json").read_text())
    value["manifestVersion"] = "1.0.0"
    del value["exportUse"], value["evidence"]
    assert validate_player_manifest(value)


def test_assembly_checks_exact_current_raw_bytes_when_reading(tmp_path, monkeypatch):
    import app.player_manifest as boundary
    from app.asset_evidence import EvidenceStore, observe_media
    from app.commands import CommandError
    from app.svg_assets import SvgAssetStore

    value = json.loads((DIRECTORY / "player-rights-manifest.json").read_text())
    document = value["document"]
    for asset in document["assets"]:
        path = tmp_path / asset["uri"]
        path.parent.mkdir(parents=True, exist_ok=True)
        entry = next(item for item in value["assets"] if item["assetId"] == asset["id"])
        if asset["kind"] == "svg":
            path.write_text('<svg viewBox="0 0 10 10"><rect width="10"/></svg>')
        else:
            import base64

            path.write_bytes(base64.b64decode(entry["dataBase64"]))
        original, current = observe_media(asset, tmp_path)
        asset["provenance"]["original"] = original
        asset["provenance"]["current"] = current
    EvidenceStore(tmp_path).write(value["evidence"][0]["text"])
    inspect = boundary.inspect_asset

    def replace_after_inspection(asset, root, store):
        result = inspect(asset, root, store)
        if asset["kind"] == "svg":
            (root / asset["uri"]).write_text('<svg viewBox="0 0 10 10">\n<rect width="10"/></svg>')
        return result

    monkeypatch.setattr(boundary, "inspect_asset", replace_after_inspection)
    with pytest.raises(CommandError):
        boundary.build_player_manifest(
            document, tmp_path, SvgAssetStore(tmp_path), "public_distribution"
        )
