"""Only contained local assets are probed; remote URIs are never fetched."""

from pathlib import Path

import pytest

from app.asset_inventory import inspect_assets


@pytest.mark.parametrize(
    ("uri", "expected"),
    [
        ("assets/ok.svg", "present"),
        ("assets/absent.svg", "missing"),
        ("https://example.test/asset.svg", "external"),
        ("//server/share.svg", "unsafe"),
        ("file:///etc/passwd", "unsafe"),
        ("C:/outside.svg", "unsafe"),
        ("/etc/passwd", "unsafe"),
        ("assets/../secret", "unsafe"),
        ("assets/%2e%2e/secret", "unsafe"),
        ("assets\\ok.svg", "unsafe"),
        ("elsewhere/ok.svg", "unsafe"),
        ("assets/ok.svg?query", "unsafe"),
    ],
)
def test_asset_uri_classification(tmp_path: Path, uri: str, expected: str) -> None:
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "ok.svg").write_text("<svg/>")
    assert inspect_assets({"assets": [{"id": "a", "uri": uri}]}, tmp_path) == {"a": expected}


def test_escaping_asset_symlink_is_unsafe(tmp_path: Path) -> None:
    root = tmp_path / "workspace"
    (root / "assets").mkdir(parents=True)
    outside = tmp_path / "secret.svg"
    outside.write_text("secret")
    try:
        (root / "assets" / "escape.svg").symlink_to(outside)
    except OSError:
        pytest.skip("Host does not allow symlinks")
    assert inspect_assets({"assets": [{"id": "a", "uri": "assets/escape.svg"}]}, root) == {
        "a": "unsafe"
    }
