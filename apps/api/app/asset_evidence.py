"""Contained immutable UTF-8 evidence and observations of exact stored media versions."""

import hashlib
import os
import re
import stat
from pathlib import Path
from typing import Any, cast

from app.asset_rights import _trim, svg_payload_hash
from app.audio_assets import _check_path, read_audio
from app.commands import CommandError
from app.evidence_directory import publication_directory
from app.svg_assets import MAX_BYTES, SvgAssetError, SvgAssetStore, SvgData, parse_svg


def invalid(message: str) -> CommandError:
    return CommandError(422, "INVALID_ASSET_EVIDENCE", message)


def _read(root: Path, uri: str, limit: int, expected: str | None = None) -> bytes:
    """Check ancestors, descriptor and post-read identity; reject links and raced reads."""
    path = root / uri
    _check_path(root, path)
    try:
        flags = (
            os.O_RDONLY
            | getattr(os, "O_BINARY", 0)
            | getattr(os, "O_NOFOLLOW", 0)
            | getattr(os, "O_NONBLOCK", 0)
        )
        with os.fdopen(os.open(path, flags), "rb") as source:
            before = os.fstat(source.fileno())
            if not stat.S_ISREG(before.st_mode) or before.st_nlink != 1 or before.st_size > limit:
                raise invalid("Evidence/media must be a bounded standalone regular file")
            raw = source.read(limit + 1)
            after = os.fstat(source.fileno())
        _check_path(root, path)
        current = path.stat()
        if (
            len(raw) > limit
            or len(raw) != before.st_size
            or (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns)
            != (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns)
            or (before.st_dev, before.st_ino) != (current.st_dev, current.st_ino)
            or current.st_nlink != 1
        ):
            raise invalid("Evidence/media changed while being read")
    except OSError as error:
        raise invalid("Evidence/media is missing or cannot be read safely") from error
    if expected is not None and hashlib.sha256(raw).hexdigest() != expected:
        raise invalid("Evidence/media integrity check failed; restore the immutable version")
    return raw


class EvidenceStore:
    def __init__(self, root: Path):
        self.root = Path(os.path.abspath(root))

    @staticmethod
    def blob(text: str) -> dict[str, str]:
        try:
            raw = text.encode("utf-8", errors="strict")
        except (UnicodeError, AttributeError) as error:
            raise invalid("Evidence must be scalar UTF-8 text") from error
        if not _trim(text) or len(raw) > 65536:
            raise invalid("Evidence must be nonempty text no larger than 64 KiB")
        digest = hashlib.sha256(raw).hexdigest()
        return {"uri": f"assets/evidence/{digest}.txt", "sha256": digest, "text": text}

    def read(self, ref: dict[str, Any]) -> dict[str, str]:
        digest = ref.get("sha256", "")
        uri = ref.get("uri", "")
        if (
            not isinstance(digest, str)
            or not re.fullmatch(r"[a-f0-9]{64}", digest)
            or uri != f"assets/evidence/{digest}.txt"
        ):
            raise invalid("Evidence reference must use its canonical hash path")
        raw = _read(self.root, uri, 65536, digest)
        try:
            blob = self.blob(raw.decode("utf-8", errors="strict"))
        except UnicodeError as error:
            raise invalid("Evidence must be scalar UTF-8 text") from error
        return blob

    def write(self, text: str) -> dict[str, str]:
        blob = self.blob(text)
        path = self.root / blob["uri"]
        _check_path(self.root, path)
        if path.exists():
            return self.read(blob)
        try:
            with publication_directory(self.root) as directory:
                temporary: str | None = None
                try:
                    descriptor, temporary = directory.create()
                    with os.fdopen(descriptor, "wb") as target:
                        target.write(text.encode("utf-8"))
                        target.flush()
                        os.fsync(target.fileno())
                    try:
                        directory.publish(temporary, path.name)
                    except FileExistsError:
                        pass
                    directory.remove(temporary)
                    temporary = None
                    return self.read(blob)
                finally:
                    if temporary is not None:
                        directory.remove(temporary)
        except OSError as error:
            raise invalid("Evidence cannot be stored safely") from error


def observe_media(asset: dict[str, Any], root: Path) -> tuple[dict[str, str], dict[str, str]]:
    root = Path(os.path.abspath(root))
    source = asset.get("sourceUri", asset["uri"])
    current = asset["uri"]
    if asset["kind"] == "svg":

        def raw(uri: str, *, original: bool = False) -> bytes:
            category = "(?:originals|imported)" if original else "imported"
            version = re.fullmatch(rf"assets/{category}/([a-f0-9]{{64}})\.svg", uri)
            fixture = re.fullmatch(r"assets/fixtures/[A-Za-z0-9][A-Za-z0-9_-]{0,127}\.svg", uri)
            if not version and not fixture:
                raise invalid("Unsupported SVG version URI")
            return _read(root, uri, MAX_BYTES, version[1] if version else None)

        original_raw = raw(source, original=True)
        current_raw = raw(current)
        payload = svg_payload_hash(
            cast(dict[str, Any], parse_svg(current_raw.decode("utf-8", errors="strict")))
        )
    elif asset["kind"] == "audio":
        original_raw = read_audio(root, source)
        current_raw = read_audio(root, current)
        payload = hashlib.sha256(current_raw).hexdigest()
    else:
        raise invalid("Unsupported media; only SVG and PCM WAV evidence can be inspected")
    return (
        {"uri": source, "sha256": hashlib.sha256(original_raw).hexdigest()},
        {
            "uri": current,
            "sha256": hashlib.sha256(current_raw).hexdigest(),
            "payloadSha256": payload,
        },
    )


def read_bound_svg(asset: dict[str, Any], root: Path) -> SvgData:
    """Bind the actual assembly read to the reviewed raw bytes, including whitespace."""
    raw = _read(
        Path(os.path.abspath(root)),
        asset["uri"],
        MAX_BYTES,
        asset["provenance"]["current"]["sha256"],
    )
    return parse_svg(raw.decode("utf-8", errors="strict"))


def inspect_asset(asset: dict[str, Any], root: Path, store: SvgAssetStore) -> dict[str, Any]:
    """Return bounded recoverable observations; never parse original source into a UI tree."""
    result: dict[str, Any] = {"original": None, "current": None, "evidence": [], "error": None}
    errors: list[str] = []
    p = asset.get("provenance")
    evidence_store = EvidenceStore(root)
    for ref in (p or {}).get("evidence", []):
        try:
            result["evidence"].append(evidence_store.read(ref))
        except CommandError as error:
            errors.append(str(error))
    try:
        result["original"], result["current"] = observe_media(asset, root)
        if p and (p["original"] != result["original"] or p["current"] != result["current"]):
            errors.append("Recorded media binding is stale or has failed integrity verification")
    except (CommandError, SvgAssetError, UnicodeError, ValueError) as error:
        errors.append(str(error))
    if errors:
        result["error"] = f"Asset {asset['id']}: " + "; ".join(dict.fromkeys(errors))[:1800]
    return result
