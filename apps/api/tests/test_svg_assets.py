"""Static SVG parsing and immutable, contained local storage."""

import hashlib
import os
import subprocess
from pathlib import Path

import pytest

from app.svg_assets import SvgAssetError, SvgAssetStore, parse_svg

SOURCE = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" id="art">'
    '<g id="group"><rect id="face" x="2" y="3" width="20" height="30" fill="#abc"/>'
    '<text id="caption" x="1" y="40">A &amp; B</text></g></svg>'
)


def test_parse_preserves_source_ids_and_static_text() -> None:
    svg = parse_svg(SOURCE)
    assert svg["viewBox"] == {"x": 0, "y": 0, "width": 100, "height": 60}
    assert svg["root"]["id"] == "art"
    assert svg["root"]["children"][0]["id"] == "group"
    assert svg["root"]["children"][0]["children"][1]["text"] == "A & B"
    assert svg["root"]["children"][0]["children"][0]["attributes"]["fill"] == "#abc"


def test_missing_ids_are_deterministic_and_never_collide_with_provided_ids() -> None:
    source = '<svg viewBox="0 0 1 1"><g id="svg-node-1"><rect width="1" height="1"/></g></svg>'
    first = parse_svg(source)
    assert first == parse_svg(source)
    ids = [
        first["root"]["id"],
        first["root"]["children"][0]["id"],
        first["root"]["children"][0]["children"][0]["id"],
    ]
    assert len(set(ids)) == 3
    assert ids[1] == "svg-node-1"


@pytest.mark.parametrize(
    "tag", ["path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text"]
)
def test_shapes_and_text_cannot_contain_child_elements(tag: str) -> None:
    source = f'<svg viewBox="0 0 1 1"><{tag}><circle r="1"/></{tag}></svg>'
    with pytest.raises(SvgAssetError) as error:
        parse_svg(source)
    assert error.value.status == 422


def test_groups_are_supported_shape_containers() -> None:
    svg = parse_svg('<svg viewBox="0 0 1 1"><g><g><rect width="1"/></g></g></svg>')
    assert svg["root"]["children"][0]["children"][0]["children"][0]["tag"] == "rect"


@pytest.mark.parametrize(
    "source",
    [
        '<svg viewBox="0 0 1 1"><script>alert(1)</script></svg>',
        '<svg viewBox="0 0 1 1" onload="alert(1)"/>',
        '<svg viewBox="0 0 1 1"><foreignObject/></svg>',
        '<svg viewBox="0 0 1 1"><image href="https://bad.test/a"/></svg>',
        '<svg viewBox="0 0 1 1"><use href="#a"/></svg>',
        '<svg viewBox="0 0 1 1"><style>rect{fill:red}</style></svg>',
        '<svg viewBox="0 0 1 1"><rect style="fill:red"/></svg>',
        '<svg viewBox="0 0 1 1"><rect fill="url(https://bad.test/a)"/></svg>',
        '<svg viewBox="0 0 1 1"><rect fill="u&#114;l(#a)"/></svg>',
        '<svg viewBox="0 0 1 1"><filter/></svg>',
        '<svg viewBox="0 0 1 1"><animate/></svg>',
        '<svg viewBox="0 0 1 1"><g id="a"/><g id="a"/></svg>',
        '<svg viewBox="0 0 1 1"><g width="3"/></svg>',
        '<svg viewBox="0 0 1 1"><g>lost text</g></svg>',
        '<svg viewBox="0 0 1 1"><text>before<g/>after</text></svg>',
        '<svg viewBox="0 0 1 1"><svg/></svg>',
        '<svg xmlns="http://evil.test/" viewBox="0 0 1 1"/>',
        '<svg xmlns:x="http://evil.test/" viewBox="0 0 1 1"/>',
        '<!DOCTYPE svg [<!ENTITY a "boom">]><svg viewBox="0 0 1 1">&a;</svg>',
        '<?xml version="1.0" encoding="utf-16"?><svg viewBox="0 0 1 1"/>',
        '<?evil data?><svg viewBox="0 0 1 1"/>',
        '<svg viewBox="0 0 1 1"><!-- hidden --></svg>',
        '<svg viewBox="0 0 1 1"><text><![CDATA[hello]]></text></svg>',
        '<svg viewBox="0 0 1 1">\x00</svg>',
        '<svg viewBox="0 0 1 1"><text>\ud800</text></svg>',
        '<svg viewBox="0 0 1 1"><rect/></not-svg>',
    ],
)
def test_unsupported_svg_is_rejected_without_stripping(source: str) -> None:
    with pytest.raises(SvgAssetError) as error:
        parse_svg(source)
    assert error.value.status == 422
    assert error.value.code
    assert error.value.message
    assert "\ud800" not in error.value.message


@pytest.mark.parametrize(
    "attribute",
    [
        'viewBox="0 0 0 10"',
        'viewBox="0 0 -1 10"',
        'viewBox="0 0 NaN 10"',
        'viewBox="0 0 1e999 10"',
        'viewBox="0 0 1000001 10"',
    ],
)
def test_viewbox_must_be_positive_finite_and_bounded(attribute: str) -> None:
    with pytest.raises(SvgAssetError):
        parse_svg(f"<svg {attribute}/>")


@pytest.mark.parametrize(
    "body",
    [
        '<rect width="-1"/>',
        '<circle r="NaN"/>',
        '<rect x="1e999"/>',
        '<path d="M0 0 L1000001 2"/>',
        '<path d="M0 0 javascript:foo"/>',
        '<path d="L0 0"/>',
        '<path d="M0 0 L1"/>',
        '<path d="M,0 0"/>',
        '<path d="M0,,0"/>',
        '<path d="M0 0,Z"/>',
        '<path d="M0 0 A1 1 0 4 0 2 2"/>',
        '<polygon points="1 2 3"/>',
        '<rect opacity="2"/>',
        '<g transform="translate(Infinity)"/>',
        '<g transform="matrix(1,2)"/>',
    ],
)
def test_unsafe_or_malformed_geometry_is_rejected(body: str) -> None:
    with pytest.raises(SvgAssetError):
        parse_svg(f'<svg viewBox="0 0 100 100">{body}</svg>')


def test_size_node_and_depth_limits() -> None:
    for source in [
        '<svg viewBox="0 0 1 1"><text>' + "é" * (128 * 1024) + "</text></svg>",
        '<svg viewBox="0 0 1 1">' + "<g/>" * 512 + "</svg>",
        '<svg viewBox="0 0 1 1">' + "<g>" * 16 + "</g>" * 16 + "</svg>",
    ]:
        with pytest.raises(SvgAssetError):
            parse_svg(source)
    assert (
        len(parse_svg('<svg viewBox="0 0 1 1">' + "<g/>" * 511 + "</svg>")["root"]["children"])
        == 511
    )


def test_storage_round_trip_and_edit_are_immutable(tmp_path: Path) -> None:
    store = SvgAssetStore(tmp_path)
    imported = store.import_svg(SOURCE)
    source_path = tmp_path / imported["sourceUri"]
    assert source_path.read_bytes() == SOURCE.encode("utf-8")
    assert (
        imported["sourceUri"]
        == f"assets/originals/{hashlib.sha256(SOURCE.encode()).hexdigest()}.svg"
    )
    before = (tmp_path / imported["uri"]).read_bytes()
    assert store.read_svg(imported["uri"]) == imported["svg"]
    assert store.import_svg(SOURCE) == imported
    edit = store.edit_svg(imported["uri"], "face", {"x": "11", "fill": "#123456"})
    assert edit["uri"] != imported["uri"]
    assert source_path.read_bytes() == SOURCE.encode()
    assert (tmp_path / imported["uri"]).read_bytes() == before
    assert store.read_svg(edit["uri"]) == edit["svg"]
    assert edit["svg"]["root"]["children"][0]["children"][0]["id"] == "face"
    assert edit["svg"]["root"]["children"][0]["children"][0]["attributes"]["x"] == "11"


def test_viewbox_precision_is_lossless_across_storage(tmp_path: Path) -> None:
    source = '<svg viewBox="0.12345678901234567 0 0.9876543210987654 1"/>'
    store = SvgAssetStore(tmp_path)
    imported = store.import_svg(source)
    assert store.read_svg(imported["uri"]) == imported["svg"]


def test_edit_noop_has_same_content_address(tmp_path: Path) -> None:
    store = SvgAssetStore(tmp_path)
    imported = store.import_svg(SOURCE)
    assert store.edit_svg(imported["uri"], "face", {"x": "2"})["uri"] == imported["uri"]


def test_hardlinked_fixture_is_rejected(tmp_path: Path) -> None:
    outside = tmp_path / "outside.svg"
    outside.write_text(SOURCE)
    fixtures = tmp_path / "workspace" / "assets" / "fixtures"
    fixtures.mkdir(parents=True)
    os.link(outside, fixtures / "a.svg")
    with pytest.raises(SvgAssetError):
        SvgAssetStore(tmp_path / "workspace").read_svg("assets/fixtures/a.svg")


def test_corrupt_original_cannot_be_overwritten(tmp_path: Path) -> None:
    store = SvgAssetStore(tmp_path)
    imported = store.import_svg(SOURCE)
    original = tmp_path / imported["sourceUri"]
    original.write_text("corrupted")
    with pytest.raises(SvgAssetError):
        store.import_svg(SOURCE)
    assert original.read_text() == "corrupted"


@pytest.mark.parametrize(
    "attrs",
    [
        {"id": "new"},
        {"viewBox": "0 0 2 2"},
        {"onclick": "a"},
        {"href": "a"},
        {"fill": "url(#a)"},
        {"cx": "3"},
        {},
    ],
)
def test_edit_validates_attributes_before_writing(tmp_path: Path, attrs: dict[str, str]) -> None:
    store = SvgAssetStore(tmp_path)
    imported = store.import_svg(SOURCE)
    files = sorted(p.relative_to(tmp_path) for p in tmp_path.rglob("*") if p.is_file())
    with pytest.raises(SvgAssetError):
        store.edit_svg(imported["uri"], "face", attrs)
    assert sorted(p.relative_to(tmp_path) for p in tmp_path.rglob("*") if p.is_file()) == files


def test_missing_element_and_file_are_typed_errors(tmp_path: Path) -> None:
    store = SvgAssetStore(tmp_path)
    imported = store.import_svg(SOURCE)
    with pytest.raises(SvgAssetError) as error:
        store.edit_svg(imported["uri"], "missing", {"x": "1"})
    assert error.value.status == 404
    with pytest.raises(SvgAssetError) as error:
        store.read_svg("assets/imported/" + "a" * 64 + ".svg")
    assert error.value.status == 404


@pytest.mark.parametrize(
    "uri",
    [
        "../a.svg",
        "assets/../a.svg",
        "assets/%2e%2e/a.svg",
        "assets\\fixtures\\a.svg",
        "/etc/passwd",
        "https://bad.test/a.svg",
        "assets/fixtures/a.svg?x=1",
        "assets/originals/" + "a" * 64 + ".svg",
        "assets/imported/fake.svg",
        "assets/fixtures/a/b.svg",
    ],
)
def test_arbitrary_paths_are_rejected(tmp_path: Path, uri: str) -> None:
    with pytest.raises(SvgAssetError):
        SvgAssetStore(tmp_path).read_svg(uri)


def test_corrupt_or_oversize_version_is_rejected(tmp_path: Path) -> None:
    store = SvgAssetStore(tmp_path)
    imported = store.import_svg(SOURCE)
    path = tmp_path / imported["uri"]
    path.write_text('<svg viewBox="0 0 1 1"/>')
    with pytest.raises(SvgAssetError):
        store.read_svg(imported["uri"])
    with pytest.raises(SvgAssetError):
        store.import_svg(SOURCE)
    path.write_bytes(b"a" * (256 * 1024 + 1))
    with pytest.raises(SvgAssetError):
        store.read_svg(imported["uri"])


def test_only_contained_fixture_svg_is_readable(tmp_path: Path) -> None:
    fixtures = tmp_path / "assets" / "fixtures"
    fixtures.mkdir(parents=True)
    (fixtures / "example.svg").write_text(SOURCE)
    assert SvgAssetStore(tmp_path).read_svg("assets/fixtures/example.svg") == parse_svg(SOURCE)


@pytest.mark.parametrize("component", ["root", "assets", "imported", "originals", "fixtures"])
def test_redirected_directories_are_rejected(tmp_path: Path, component: str) -> None:
    root = tmp_path / "workspace"
    outside = tmp_path / "outside"
    root.mkdir()
    outside.mkdir()
    if component == "root":
        root.rmdir()
        redirected = root
    elif component == "assets":
        redirected = root / "assets"
    else:
        (root / "assets").mkdir()
        redirected = root / "assets" / component
    if os.name == "nt":
        result = subprocess.run(
            ["cmd", "/c", "mklink", "/J", str(redirected), str(outside)],
            capture_output=True,
            check=False,
        )
        assert result.returncode == 0, result.stderr
    else:
        redirected.symlink_to(outside, target_is_directory=True)
    try:
        with pytest.raises(SvgAssetError):
            SvgAssetStore(root).import_svg(SOURCE)
        assert list(outside.iterdir()) == []
    finally:
        # Remove the junction itself with native Path; never traverse its target.
        if os.name == "nt":
            redirected.rmdir()
        else:
            redirected.unlink()
