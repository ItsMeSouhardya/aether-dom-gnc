"""Bounded static SVG trees and immutable, contained local SVG versions.

This deliberately supports a small editable subset. Rejection is preferable to
silently changing authored content, and no original XML is sent to a browser.
"""

from __future__ import annotations

import hashlib
import io
import math
import os
import re
import stat
import tempfile
from pathlib import Path
from typing import Literal, TypedDict, cast
from xml.etree import ElementTree as ET

MAX_BYTES = 256 * 1024
MAX_NODES = 512
MAX_DEPTH = 16
MAX_VALUE = 1_000_000
SVG_NS = "http://www.w3.org/2000/svg"
Tag = Literal[
    "svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text"
]
TAGS = {"svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text"}


class ViewBox(TypedDict):
    x: float
    y: float
    width: float
    height: float


class SvgNode(TypedDict):
    tag: Tag
    id: str
    attributes: dict[str, str]
    text: str
    children: list[SvgNode]


class SvgData(TypedDict):
    viewBox: ViewBox
    root: SvgNode


class ImportedSvg(TypedDict):
    uri: str
    sourceUri: str
    svg: SvgData


class EditedSvg(TypedDict):
    uri: str
    svg: SvgData


class SvgAssetError(Exception):
    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


def _invalid(message: str = "SVG contains unsupported or unsafe content.") -> SvgAssetError:
    return SvgAssetError(422, "INVALID_SVG", message)


NUMBER = r"[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?"
NUMBER_RE = re.compile(NUMBER)
ID_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_.:-]{0,127}\Z")
PRESENTATION = {
    "fill",
    "stroke",
    "stroke-width",
    "opacity",
    "fill-opacity",
    "stroke-opacity",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-miterlimit",
    "fill-rule",
    "clip-rule",
    "vector-effect",
    "transform",
}
GEOMETRY = {
    "svg": {"width", "height", "preserveAspectRatio"},
    "g": set(),
    "path": {"d"},
    "rect": {"x", "y", "width", "height", "rx", "ry"},
    "circle": {"cx", "cy", "r"},
    "ellipse": {"cx", "cy", "rx", "ry"},
    "line": {"x1", "y1", "x2", "y2"},
    "polyline": {"points"},
    "polygon": {"points"},
    "text": {
        "x",
        "y",
        "dx",
        "dy",
        "font-size",
        "font-family",
        "font-weight",
        "text-anchor",
        "dominant-baseline",
        "letter-spacing",
    },
}
ENUMS = {
    "stroke-linecap": {"butt", "round", "square"},
    "stroke-linejoin": {"miter", "round", "bevel"},
    "fill-rule": {"nonzero", "evenodd"},
    "clip-rule": {"nonzero", "evenodd"},
    "vector-effect": {"none", "non-scaling-stroke"},
    "text-anchor": {"start", "middle", "end"},
    "dominant-baseline": {
        "auto",
        "middle",
        "central",
        "hanging",
        "alphabetic",
        "text-before-edge",
        "text-after-edge",
    },
    "font-weight": {"normal", "bold", *map(str, range(100, 1000, 100))},
}


def _number(value: str, *, minimum: float = -MAX_VALUE, maximum: float = MAX_VALUE) -> float:
    if not NUMBER_RE.fullmatch(value):
        raise _invalid("SVG numbers must be finite, bounded unitless values.")
    result = float(value)
    if not math.isfinite(result) or not minimum <= result <= maximum:
        raise _invalid("SVG numbers must be finite and within supported bounds.")
    return result


def _numbers(value: str) -> list[float]:
    """Parse SVG comma/whitespace or sign-separated number lists without stripping junk."""
    result: list[float] = []
    position = 0
    for match in NUMBER_RE.finditer(value):
        gap = value[position : match.start()]
        if gap and not re.fullmatch(r"[\s,]+", gap):
            raise _invalid()
        if not gap and position and value[match.start()] not in "+-.":
            raise _invalid()
        if not result and "," in gap:
            raise _invalid()
        if gap.count(",") > 1:
            raise _invalid()
        result.append(_number(match.group()))
        position = match.end()
    if value[position:].strip() or not result:
        raise _invalid()
    return result


def _path(value: str) -> None:
    tokens = list(re.finditer(rf"[A-Za-z]|{NUMBER}", value))
    position = 0
    command = ""
    previous_number = False
    values: list[float] = []
    arity = {"M": 2, "L": 2, "H": 1, "V": 1, "C": 6, "S": 4, "Q": 4, "T": 2, "A": 7, "Z": 0}

    def check() -> None:
        size = arity.get(command.upper())
        if size is None or (size == 0 and values) or (size and (not values or len(values) % size)):
            raise _invalid("SVG path commands have invalid parameters.")
        if command.upper() == "A":
            for start in range(0, len(values), 7):
                if values[start] < 0 or values[start + 1] < 0:
                    raise _invalid()
                if values[start + 3] not in (0, 1) or values[start + 4] not in (0, 1):
                    raise _invalid()

    for token in tokens:
        gap = value[position : token.start()]
        if gap and not re.fullmatch(r"[\s,]+", gap):
            raise _invalid()
        raw = token.group()
        if "," in gap and (gap.count(",") != 1 or not previous_number or raw.isalpha()):
            raise _invalid("SVG path separators are malformed.")
        if raw.isalpha():
            if command:
                check()
            elif raw.upper() != "M":
                raise _invalid("SVG paths must begin with moveto.")
            if raw.upper() not in arity:
                raise _invalid()
            command = raw
            values = []
        else:
            if not command or command.upper() == "Z":
                raise _invalid()
            values.append(_number(raw))
        previous_number = not raw.isalpha()
        position = token.end()
    if value[position:].strip() or not command:
        raise _invalid()
    check()


def _transform(value: str) -> None:
    position = 0
    count = 0
    arities = {
        "matrix": {6},
        "translate": {1, 2},
        "scale": {1, 2},
        "rotate": {1, 3},
        "skewX": {1},
        "skewY": {1},
    }
    for match in re.finditer(r"([A-Za-z]+)\s*\(([^()]*)\)", value):
        if value[position : match.start()].strip(" \t\r\n,"):
            raise _invalid()
        if match[1] not in arities or len(_numbers(match[2])) not in arities[match[1]]:
            raise _invalid()
        position = match.end()
        count += 1
    if value[position:].strip() or not 0 < count <= 32:
        raise _invalid()


def _attribute(tag: str, name: str, value: str) -> None:
    if name not in PRESENTATION | GEOMETRY[tag] or not isinstance(value, str):
        raise _invalid("SVG attribute is unsupported for this element.")
    if len(value.encode("utf-8")) > (32_768 if name in {"d", "points"} else 1024):
        raise _invalid("SVG attribute exceeds the supported size.")
    if name in {"fill", "stroke"}:
        if not re.fullmatch(
            r"(?:#[0-9a-fA-F]{3,4}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|[A-Za-z]{1,32})", value
        ):
            raise _invalid("SVG paint must be a simple color or none.")
    elif name in ENUMS:
        if value not in ENUMS[name]:
            raise _invalid()
    elif name == "font-family":
        if not re.fullmatch(r"[A-Za-z][A-Za-z0-9 ,'-]{0,127}", value):
            raise _invalid()
    elif name == "preserveAspectRatio":
        if not re.fullmatch(
            r"(?:none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max)(?: (?:meet|slice))?)", value
        ):
            raise _invalid()
    elif name == "d":
        _path(value)
    elif name == "points":
        coordinates = _numbers(value)
        if len(coordinates) < 4 or len(coordinates) % 2:
            raise _invalid()
    elif name == "transform":
        _transform(value)
    elif name in {"opacity", "fill-opacity", "stroke-opacity"}:
        _number(value, minimum=0, maximum=1)
    elif name in {
        "width",
        "height",
        "rx",
        "ry",
        "r",
        "stroke-width",
        "font-size",
        "stroke-miterlimit",
    }:
        _number(value, minimum=0)
    else:
        _number(value)


def _input_bytes(text: str) -> bytes:
    try:
        raw = text.encode("utf-8", errors="strict")
    except (AttributeError, UnicodeError) as error:
        raise _invalid("SVG must contain valid Unicode text.") from error
    if len(raw) > MAX_BYTES:
        raise _invalid("SVG exceeds the 256 KiB limit.")
    if "\x00" in text or "<!" in text:
        raise _invalid("SVG declarations, entities and markup extensions are unsupported.")
    declaration = re.match(
        r'\A\ufeff?<\?xml\s+version=[\'"]1\.0[\'"](?:\s+encoding=[\'"]UTF-8[\'"])?(?:\s+standalone=[\'"](?:yes|no)[\'"])?\s*\?>',
        text,
        re.I,
    )
    remainder = text[declaration.end() :] if declaration else text
    if "<?" in remainder:
        raise _invalid("SVG processing instructions and alternate encodings are unsupported.")
    return raw


def parse_svg(text: str) -> SvgData:
    raw = _input_bytes(text)
    try:
        parser = ET.iterparse(io.BytesIO(raw), events=("start", "end", "start-ns"))
        count = 0
        depth = 0
        root_element: ET.Element | None = None
        for event, item in parser:
            if event == "start-ns":
                if item != ("", SVG_NS):
                    raise _invalid("SVG namespaces are unsupported.")
            elif event == "start":
                if root_element is None:
                    root_element = item
                count += 1
                depth += 1
                if count > MAX_NODES or depth > MAX_DEPTH:
                    raise _invalid("SVG exceeds the supported node or nesting limit.")
            else:
                depth -= 1
        if root_element is None:
            raise _invalid("SVG XML is empty.")
        element = root_element
    except (ET.ParseError, ValueError, UnicodeError) as error:
        raise _invalid("SVG XML is malformed.") from error

    def tag_name(node: ET.Element) -> str:
        tag = node.tag
        if tag.startswith("{" + SVG_NS + "}"):
            tag = tag[len(SVG_NS) + 2 :]
        if tag not in TAGS:
            raise _invalid("SVG element is unsupported.")
        return tag

    if tag_name(element) != "svg":
        raise _invalid("SVG requires an svg root element.")
    used: set[str] = set()
    for node in element.iter():
        if "id" in node.attrib:
            identity = node.attrib["id"]
            if not ID_RE.fullmatch(identity) or identity in used:
                raise _invalid("SVG element IDs must be unique supported identifiers.")
            used.add(identity)
    if "viewBox" in element.attrib:
        box = _numbers(element.attrib["viewBox"])
        if len(box) != 4 or box[2] <= 0 or box[3] <= 0:
            raise _invalid("SVG requires a positive finite viewBox.")
    else:
        try:
            box = [0.0, 0.0, _number(element.attrib["width"]), _number(element.attrib["height"])]
        except KeyError as error:
            raise _invalid("SVG requires a viewBox or numeric width and height.") from error
        if box[2] <= 0 or box[3] <= 0:
            raise _invalid("SVG requires positive dimensions.")
    sequence = 0

    def convert(node: ET.Element, *, root: bool = False) -> SvgNode:
        nonlocal sequence
        tag = tag_name(node)
        if tag == "svg" and not root:
            raise _invalid("Nested SVG viewports are unsupported.")
        if len(node) and tag not in {"svg", "g"}:
            raise _invalid("Only SVG roots and groups may contain child elements.")
        identity = node.attrib.get("id")
        if identity is None:
            while True:
                sequence += 1
                identity = f"svg-node-{sequence}"
                if identity not in used:
                    used.add(identity)
                    break
        attributes: dict[str, str] = {}
        for name, value in node.attrib.items():
            if name == "id" or (root and name == "viewBox"):
                continue
            _attribute(tag, name, value)
            attributes[name] = value
        if tag == "text":
            if len(node) or len((node.text or "").encode("utf-8")) > 16_384:
                raise _invalid("SVG text must be bounded plain text.")
            content = node.text or ""
        else:
            if node.text and node.text.strip():
                raise _invalid("Only SVG text elements may contain text.")
            content = ""
        if node.tail and node.tail.strip():
            raise _invalid("SVG mixed text content is unsupported.")
        return {
            "tag": cast(Tag, tag),
            "id": identity,
            "attributes": attributes,
            "text": content,
            "children": [convert(child) for child in node],
        }

    return {
        "viewBox": {"x": box[0], "y": box[1], "width": box[2], "height": box[3]},
        "root": convert(element, root=True),
    }


def _serialize(svg: SvgData) -> bytes:
    def element(node: SvgNode) -> ET.Element:
        result: ET.Element = ET.Element(
            node["tag"], {"id": node["id"], **dict(sorted(node["attributes"].items()))}
        )
        result.text = node["text"] or None
        result.extend(element(child) for child in node["children"])
        return result

    root = element(svg["root"])
    root.set("xmlns", SVG_NS)
    box = svg["viewBox"]
    root.set("viewBox", " ".join(map(repr, (box["x"], box["y"], box["width"], box["height"]))))
    encoded = cast(bytes, ET.tostring(root, encoding="utf-8", short_empty_elements=True))
    if len(encoded) > MAX_BYTES:
        raise _invalid("Normalized SVG exceeds the 256 KiB limit.")
    return encoded


class SvgAssetStore:
    def __init__(self, root: Path) -> None:
        # absolute(), unlike resolve(), does not erase evidence of a redirected root.
        self.root = Path(os.path.abspath(root))

    def _check_path(self, path: Path) -> None:
        try:
            path.relative_to(self.root)
            for component in (*reversed(path.parents), path):
                try:
                    info = component.lstat()
                except FileNotFoundError:
                    continue
                if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & getattr(
                    stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400
                ):
                    raise SvgAssetError(
                        422, "UNSAFE_ASSET_PATH", "Asset storage cannot use redirected paths."
                    )
            if not path.resolve().is_relative_to(self.root.resolve()):
                raise SvgAssetError(422, "UNSAFE_ASSET_PATH", "Asset path escapes local storage.")
        except (OSError, ValueError) as error:
            raise SvgAssetError(
                422, "UNSAFE_ASSET_PATH", "Asset path is inaccessible or unsafe."
            ) from error

    def _check_directories(self) -> None:
        for part in ("", "assets", "assets/originals", "assets/imported", "assets/fixtures"):
            self._check_path(self.root / part)

    def _read(self, path: Path, expected: str | None = None) -> bytes:
        self._check_directories()
        self._check_path(path)
        try:
            flags = os.O_RDONLY | getattr(os, "O_BINARY", 0) | getattr(os, "O_NOFOLLOW", 0)
            with os.fdopen(os.open(path, flags), "rb") as source:
                info = os.fstat(source.fileno())
                if not stat.S_ISREG(info.st_mode) or info.st_size > MAX_BYTES or info.st_nlink > 1:
                    raise _invalid("SVG file is not a bounded standalone regular file.")
                raw = source.read(MAX_BYTES + 1)
            self._check_path(path)
        except FileNotFoundError as error:
            raise SvgAssetError(404, "ASSET_NOT_FOUND", "SVG asset file was not found.") from error
        except OSError as error:
            raise SvgAssetError(
                422, "UNSAFE_ASSET_PATH", "SVG asset file cannot be read safely."
            ) from error
        if len(raw) > MAX_BYTES or (expected and hashlib.sha256(raw).hexdigest() != expected):
            raise _invalid("SVG version integrity check failed.")
        return raw

    def _write(self, category: str, raw: bytes) -> str:
        digest = hashlib.sha256(raw).hexdigest()
        uri = f"assets/{category}/{digest}.svg"
        path = self.root / uri
        self._check_directories()
        self._check_path(path)
        if path.exists():
            if self._read(path, digest) != raw:
                raise _invalid("SVG immutable version already exists with different content.")
            return uri
        temporary: Path | None = None
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            self._check_directories()
            descriptor, name = tempfile.mkstemp(prefix=".svg-", suffix=".tmp", dir=path.parent)
            temporary = Path(name)
            with os.fdopen(descriptor, "wb") as target:
                target.write(raw)
                target.flush()
                os.fsync(target.fileno())
            self._check_path(path)
            try:
                # Atomically publish a complete file without replacing an existing version.
                os.link(temporary, path)
            except FileExistsError:
                # Drop our temporary link before checking the immutable winner.
                temporary.unlink()
                temporary = None
                self._read(path, digest)
            self._check_path(path)
        except OSError as error:
            raise SvgAssetError(
                422, "ASSET_STORAGE_ERROR", "SVG asset could not be stored safely."
            ) from error
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)
        return uri

    def import_svg(self, text: str) -> ImportedSvg:
        svg = parse_svg(text)
        normalized = _serialize(svg)
        # Check all directories before any writes, including the other category.
        self._check_directories()
        source_uri = self._write("originals", text.encode("utf-8"))
        uri = self._write("imported", normalized)
        return {"uri": uri, "sourceUri": source_uri, "svg": svg}

    def read_svg(self, uri: str) -> SvgData:
        version = re.fullmatch(r"assets/imported/([0-9a-f]{64})\.svg", uri)
        fixture = re.fullmatch(r"assets/fixtures/[A-Za-z0-9][A-Za-z0-9_-]{0,127}\.svg", uri)
        if not version and not fixture:
            raise SvgAssetError(
                422, "UNSAFE_ASSET_PATH", "SVG URI is not a supported local asset path."
            )
        raw = self._read(self.root / uri, version[1] if version else None)
        try:
            return parse_svg(raw.decode("utf-8", errors="strict"))
        except UnicodeError as error:
            raise _invalid("SVG file must use UTF-8 encoding.") from error

    def edit_svg(self, uri: str, element_id: str, attributes: dict[str, str]) -> EditedSvg:
        svg = self.read_svg(uri)
        if not attributes:
            raise _invalid("SVG edits must contain supported attributes.")
        stack = [svg["root"]]
        selected: SvgNode | None = None
        while stack:
            node = stack.pop()
            if node["id"] == element_id:
                selected = node
                break
            stack.extend(node["children"])
        if selected is None:
            raise SvgAssetError(404, "SVG_ELEMENT_NOT_FOUND", "SVG source element was not found.")
        for name, value in attributes.items():
            try:
                value.encode("utf-8", errors="strict")
                _attribute(selected["tag"], name, value)
            except (UnicodeError, AttributeError) as error:
                raise _invalid("SVG edit must contain valid Unicode attribute strings.") from error
        selected["attributes"].update(attributes)
        normalized = _serialize(svg)
        # Validate the complete edited document before publishing any blob.
        result = parse_svg(normalized.decode("utf-8"))
        return {"uri": self._write("imported", normalized), "svg": result}
