"""Immutable text evidence and observed media identity stay contained and version bound."""

import copy
import hashlib
import importlib
import os
import subprocess
import sys

import pytest

from app.commands import CommandError
from app.svg_assets import SvgAssetStore


def boundary():
    assert importlib.util.find_spec("app.asset_evidence"), "Missing contained evidence storage"
    return importlib.import_module("app.asset_evidence")


def test_immutable_text_roundtrip_and_corruption(tmp_path):
    store = boundary().EvidenceStore(tmp_path)
    blob = store.write("Recorded creator permission — café")
    assert blob["sha256"] == hashlib.sha256(blob["text"].encode()).hexdigest()
    assert blob["uri"] == f"assets/evidence/{blob['sha256']}.txt"
    assert store.write(blob["text"]) == blob
    assert store.read(blob) == blob
    (tmp_path / blob["uri"]).write_text("tampered")
    with pytest.raises(CommandError):
        store.read(blob)
    with pytest.raises(CommandError):
        store.write(blob["text"])


@pytest.mark.parametrize("text", ["", " \n", "é" * 32769, "\ud800"])
def test_evidence_rejects_unusable_text(tmp_path, text):
    with pytest.raises(CommandError):
        boundary().EvidenceStore(tmp_path).write(text)
    assert not (tmp_path / "assets").exists()


@pytest.mark.parametrize("uri", ["../secret", "assets/evidence/../secret", "assets/evidence/A.txt"])
def test_evidence_never_reads_arbitrary_path(tmp_path, uri):
    with pytest.raises(CommandError):
        boundary().EvidenceStore(tmp_path).read({"uri": uri, "sha256": "a" * 64})


def test_hardlinked_evidence_is_rejected(tmp_path):
    store = boundary().EvidenceStore(tmp_path)
    blob = store.write("Permission")
    os.link(tmp_path / blob["uri"], tmp_path / "alias")
    with pytest.raises(CommandError):
        store.read(blob)


def test_media_observation_distinguishes_original_and_current(tmp_path):
    module = boundary()
    svg_store = SvgAssetStore(tmp_path)
    imported = svg_store.import_svg('<svg viewBox="0 0 10 10"><rect width="10"/></svg>')
    asset = {
        "id": "art",
        "kind": "svg",
        "rights": "project_original",
        "uri": imported["uri"],
        "sourceUri": imported["sourceUri"],
    }
    original = (tmp_path / imported["sourceUri"]).read_bytes()
    observed = module.inspect_asset(asset, tmp_path, svg_store)
    assert observed["error"] is None
    assert observed["original"]["sha256"] == hashlib.sha256(original).hexdigest()
    changed = svg_store.edit_svg(asset["uri"], "svg-node-2", {"width": "9"})
    updated = {**copy.deepcopy(asset), "uri": changed["uri"]}
    second = module.inspect_asset(updated, tmp_path, svg_store)
    assert second["original"] == observed["original"]
    assert second["current"] != observed["current"]
    assert (tmp_path / imported["sourceUri"]).read_bytes() == original


@pytest.mark.parametrize("component", ["root", "assets", "evidence"])
def test_redirected_evidence_directory_is_rejected(tmp_path, component):
    target = tmp_path / "target"
    target.mkdir()
    root = tmp_path / "workspace"
    if component == "root":
        link = root
    elif component == "assets":
        root.mkdir()
        link = root / "assets"
    else:
        (root / "assets").mkdir(parents=True)
        link = root / "assets/evidence"
    if os.name == "nt":
        subprocess.run(
            ["cmd", "/c", "mklink", "/J", str(link), str(target)], check=True, capture_output=True
        )
    else:
        link.symlink_to(target, target_is_directory=True)
    try:
        with pytest.raises(CommandError):
            boundary().EvidenceStore(root).write("Permission")
        assert list(target.iterdir()) == []
    finally:
        # Remove only the link itself, never traverse the target.
        if os.name == "nt":
            link.rmdir()
        else:
            link.unlink()


def test_missing_and_nonregular_evidence_are_rejected(tmp_path):
    store = boundary().EvidenceStore(tmp_path)
    blob = store.blob("Permission")
    with pytest.raises(CommandError):
        store.read(blob)
    (tmp_path / blob["uri"]).mkdir(parents=True)
    with pytest.raises(CommandError):
        store.read(blob)


@pytest.mark.parametrize("phase", ["create", "publish"])
def test_directory_swap_cannot_write_or_clean_up_external_files(tmp_path, monkeypatch, phase):
    module = boundary()
    root, external = tmp_path / "storage", tmp_path / "external-sentinel"
    directory = root / "assets/evidence"
    directory.mkdir(parents=True)
    external.mkdir()
    (external / "keep.txt").write_bytes(b"Keep this external sentinel unchanged")
    moved = directory.with_name("previous-evidence")
    attempted = swapped = created_outside = False
    expected = {"keep.txt": (external / "keep.txt").read_bytes()}
    from app.evidence_directory import PublicationDirectory

    original_create, original_publish = PublicationDirectory.create, PublicationDirectory.publish

    def attempt_swap(temporary):
        nonlocal attempted, swapped, expected
        attempted = True
        try:
            directory.rename(moved)
        except PermissionError:
            # A retained Windows directory handle must exclude replacement.
            return
        swapped = True
        if os.name == "nt":
            subprocess.run(
                ["cmd", "/c", "mklink", "/J", str(directory), str(external)],
                check=True,
                capture_output=True,
            )
        else:
            directory.symlink_to(external, target_is_directory=True)
        if phase == "publish":
            # Catch pathname-based source publication AND pathname-based cleanup.
            name = os.path.basename(temporary)
            (external / name).write_bytes(b"External collision must survive cleanup")
            expected[name] = (external / name).read_bytes()

    def creating(self):
        nonlocal created_outside
        if phase == "create" and not attempted:
            attempt_swap("unused.tmp")
        result = original_create(self)
        if phase == "create" and attempted:
            created_outside |= any(item.name not in expected for item in external.iterdir())
        return result

    def publishing(self, source, destination):
        nonlocal created_outside
        if phase == "publish" and not attempted:
            attempt_swap(source)
        result = original_publish(self, source, destination)
        created_outside |= any(item.name not in expected for item in external.iterdir())
        return result

    monkeypatch.setattr(PublicationDirectory, "create", creating)
    monkeypatch.setattr(PublicationDirectory, "publish", publishing)
    try:
        try:
            module.EvidenceStore(root).write("Creator permission")
        except CommandError:
            pass  # Rejecting a swapped path is also a safe outcome.
        assert attempted, "The real filesystem swap must run at the write boundary"
        assert not created_outside, "Publication must never create an external file"
        assert {p.name: p.read_bytes() for p in external.iterdir()} == expected
    finally:
        if swapped:
            if os.name == "nt":
                directory.rmdir()
            else:
                directory.unlink()
            moved.rename(directory)


@pytest.mark.skipif(os.name == "nt", reason="POSIX FIFO regression; Windows has no os.mkfifo")
@pytest.mark.parametrize("kind", ["evidence", "svg", "audio", "legacy_svg"])
def test_fifo_read_returns_without_a_writer_in_bounded_subprocess(tmp_path, kind):
    store = boundary().EvidenceStore(tmp_path)
    ref = store.blob("Permission")
    extension = "svg" if kind == "legacy_svg" else kind
    uri = ref["uri"] if kind == "evidence" else f"assets/fixtures/special.{extension}"
    path = tmp_path / uri
    path.parent.mkdir(parents=True)
    os.mkfifo(path)
    script = """
import json, sys
from pathlib import Path
from app.asset_evidence import EvidenceStore, observe_media
from app.commands import CommandError
from app.svg_assets import SvgAssetError, SvgAssetStore
root, kind, uri, ref = Path(sys.argv[1]), sys.argv[2], sys.argv[3], json.loads(sys.argv[4])
try:
    if kind == 'evidence':
        EvidenceStore(root).read(ref)
    elif kind == 'legacy_svg':
        SvgAssetStore(root).read_svg(uri)
    else:
        observe_media({'id':'fifo', 'kind':kind, 'uri':uri}, root)
except (CommandError, SvgAssetError):
    sys.exit(0)
sys.exit(1)
"""
    import json

    result = subprocess.run(
        [sys.executable, "-c", script, str(tmp_path), kind, uri, json.dumps(ref)],
        capture_output=True,
        timeout=3,
        check=False,
    )
    assert result.returncode == 0, result.stderr


@pytest.mark.skipif(os.name != "nt", reason="Native Windows in-place junction conversion")
@pytest.mark.parametrize("access", [0x40000000, 0x100], ids=["generic-write", "write-attributes"])
def test_in_place_reparse_conversion_cannot_escape_evidence_authority(
    tmp_path, monkeypatch, access
):
    import ctypes
    import struct
    from ctypes import wintypes

    def convert(directory, target):
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        create = kernel.CreateFileW
        create.argtypes = [
            wintypes.LPCWSTR,
            wintypes.DWORD,
            wintypes.DWORD,
            ctypes.c_void_p,
            wintypes.DWORD,
            wintypes.DWORD,
            wintypes.HANDLE,
        ]
        create.restype = wintypes.HANDLE
        control = kernel.DeviceIoControl
        control.argtypes = [
            wintypes.HANDLE,
            wintypes.DWORD,
            ctypes.c_void_p,
            wintypes.DWORD,
            ctypes.c_void_p,
            wintypes.DWORD,
            ctypes.POINTER(wintypes.DWORD),
            ctypes.c_void_p,
        ]
        control.restype = wintypes.BOOL
        close = kernel.CloseHandle
        close.argtypes, close.restype = [wintypes.HANDLE], wintypes.BOOL
        # Request actual directory write access, with compatible attacker sharing.
        handle = create(str(directory), access, 7, None, 3, 0x02000000 | 0x00200000, None)
        if handle == ctypes.c_void_p(-1).value:
            return ctypes.get_last_error()
        substitute = ("\\??\\" + str(target)).encode("utf-16-le")
        printed = str(target).encode("utf-16-le")
        paths = substitute + b"\0\0" + printed + b"\0\0"
        raw = (
            struct.pack(
                "<IHHHHHH",
                0xA0000003,
                8 + len(paths),
                0,
                0,
                len(substitute),
                len(substitute) + 2,
                len(printed),
            )
            + paths
        )
        buffer = ctypes.create_string_buffer(raw)
        returned = wintypes.DWORD()
        try:
            if not control(
                handle, 0x000900A4, buffer, len(raw), None, 0, ctypes.byref(returned), None
            ):
                return ctypes.get_last_error()
            return 0
        finally:
            close(handle)

    external = tmp_path / "external-sentinel"
    external.mkdir()
    (external / "keep.txt").write_bytes(b"External sentinel must remain unchanged")
    # An unlocked successful control is mandatory: sandbox or privilege denial
    # cannot be counted as proof that the application lock prevented mutation.
    unlocked = tmp_path / "unlocked-control"
    unlocked.mkdir()
    control_error = convert(unlocked, external)
    assert control_error == 0, f"Unlocked native control must succeed: WinError{control_error}"
    try:
        (unlocked / "control.txt").write_bytes(b"Control proves actual pathname redirection")
        assert (
            external / "control.txt"
        ).read_bytes() == b"Control proves actual pathname redirection"
        (external / "control.txt").unlink()
    finally:
        unlocked.rmdir()  # Only remove the junction itself.

    root = tmp_path / "storage"
    directory = root / "assets/evidence"
    directory.mkdir(parents=True)
    expected = {p.name: p.read_bytes() for p in external.iterdir()}
    from app.evidence_directory import PublicationDirectory

    original_create = PublicationDirectory.create
    conversion_error = None
    observed_creation = False

    def creating(self):
        nonlocal conversion_error, observed_creation
        if conversion_error is None:
            conversion_error = convert(directory, external)
        descriptor = original_create(self)
        observed_creation |= any(p.name not in expected for p in external.iterdir())
        return descriptor

    monkeypatch.setattr(PublicationDirectory, "create", creating)
    try:
        try:
            result = boundary().EvidenceStore(root).write("Reviewed creator statement")
        except CommandError:
            result = None
        assert conversion_error == (32 if access == 0x40000000 else 0)
        assert not observed_creation, "In-place redirection must never create external evidence"
        assert {p.name: p.read_bytes() for p in external.iterdir()} == expected
        if access == 0x40000000:
            assert result == boundary().EvidenceStore.blob("Reviewed creator statement")
        else:
            assert result is None  # Relative creation must fail closed on in-place reparse.
    finally:
        if conversion_error == 0:
            directory.rmdir()  # Remove the junction without traversing its target.


@pytest.mark.parametrize("winner", [b"Creator permission", b"Corrupt immutable winner"])
def test_atomic_evidence_publication_never_replaces_a_racing_winner(tmp_path, monkeypatch, winner):
    from app.evidence_directory import PublicationDirectory

    original_publish = PublicationDirectory.publish
    blob = boundary().EvidenceStore.blob("Creator permission")

    def race(self, temporary, destination):
        (self.path / destination).write_bytes(winner)
        return original_publish(self, temporary, destination)

    monkeypatch.setattr(PublicationDirectory, "publish", race)
    store = boundary().EvidenceStore(tmp_path)
    if winner == b"Creator permission":
        assert store.write("Creator permission") == blob
    else:
        with pytest.raises(CommandError):
            store.write("Creator permission")
    assert (tmp_path / blob["uri"]).read_bytes() == winner
    assert list((tmp_path / "assets/evidence").glob(".evidence-*.tmp")) == []
