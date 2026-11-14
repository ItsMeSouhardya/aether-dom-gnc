"""Read a bounded local PCM16 WAV; never follow an authored URI onto the network."""
import os
import stat
import struct
from pathlib import Path, PurePosixPath
from urllib.parse import urlsplit

from app.commands import CommandError

MAX_BYTES = 8 * 1024 * 1024


def _invalid(message: str = "Audio must be a bounded PCM16 mono or stereo WAV.") -> CommandError:
    return CommandError(422, "INVALID_AUDIO", message)


def _unsafe() -> CommandError:
    return CommandError(422, "UNSAFE_ASSET_PATH", "Audio storage path is inaccessible or unsafe.")


def _check_path(root: Path, path: Path) -> None:
    # Inspect every ancestor, including the workspace itself, before resolve()
    # can erase evidence of symlinks or Windows junctions/reparse points.
    try:
        path.relative_to(root)
        for component in (*reversed(path.parents), path):
            try:
                info = component.lstat()
            except FileNotFoundError:
                continue
            if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & getattr(
                stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400,
            ):
                raise _unsafe()
        if not path.resolve().is_relative_to((root / "assets").resolve()):
            raise _unsafe()
    except (OSError, ValueError, RuntimeError) as error:
        raise _unsafe() from error


def _validate_wav(raw: bytes) -> None:
    if (len(raw) < 44 or raw[:4] != b"RIFF" or raw[8:12] != b"WAVE"
            or struct.unpack_from("<I", raw, 4)[0] != len(raw) - 8):
        raise _invalid()
    position = 12
    format_data: tuple[int, int, int, int, int, int] | None = None
    data_size: int | None = None
    while position < len(raw):
        if position + 8 > len(raw):
            raise _invalid("WAV chunk header is truncated.")
        kind, size = struct.unpack_from("<4sI", raw, position)
        start = position + 8
        end = start + size
        position = end + (size % 2)
        if position > len(raw):
            raise _invalid("WAV chunk data is truncated.")
        if kind == b"fmt ":
            if format_data is not None or size != 16 or data_size is not None:
                raise _invalid("WAV requires one PCM format chunk before its audio data.")
            format_data = struct.unpack_from("<HHIIHH", raw, start)
        elif kind == b"data":
            if data_size is not None or format_data is None:
                raise _invalid("WAV requires one audio data chunk after its format.")
            data_size = size
    if format_data is None or data_size is None:
        raise _invalid()
    encoding, channels, rate, byte_rate, alignment, bits = format_data
    if (encoding != 1 or channels not in (1, 2) or not 8000 <= rate <= 48000 or bits != 16
            or alignment != channels * 2 or byte_rate != rate * alignment
            or data_size == 0 or data_size % alignment or data_size > rate * alignment * 30):
        raise _invalid()


def read_audio(root: Path, uri: str) -> bytes:
    """Resolve only clean, standalone files inside a nonredirected assets tree."""
    try:
        parsed = urlsplit(uri)
        relative = PurePosixPath(uri)
        if (parsed.scheme or parsed.netloc or parsed.query or parsed.fragment
                or "\\" in uri or "%" in uri or ":" in uri
                or any(ord(char) < 32 for char in uri)
                or relative.is_absolute() or len(relative.parts) < 2
                or relative.parts[0] != "assets" or ".." in relative.parts
                or "/".join(relative.parts) != uri):
            raise _unsafe()
        workspace = Path(os.path.abspath(root))
        path = workspace / Path(*relative.parts)
        _check_path(workspace, path)
        flags = (os.O_RDONLY | getattr(os, "O_BINARY", 0) | getattr(os, "O_NOFOLLOW", 0)
                 | getattr(os, "O_NONBLOCK", 0))
        with os.fdopen(os.open(path, flags), "rb") as source:
            before = os.fstat(source.fileno())
            if (not stat.S_ISREG(before.st_mode) or before.st_nlink != 1
                    or before.st_size > MAX_BYTES):
                raise _invalid("Audio must be a standalone regular WAV no larger than 8 MiB.")
            raw = source.read(MAX_BYTES + 1)
            after = os.fstat(source.fileno())
        _check_path(workspace, path)
        current = path.stat()
        if (len(raw) != before.st_size or len(raw) > MAX_BYTES
                or (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns)
                != (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns)
                or (before.st_dev, before.st_ino) != (current.st_dev, current.st_ino)
                or current.st_nlink != 1):
            raise _invalid("Audio changed while being read.")
    except FileNotFoundError as error:
        raise CommandError(404, "ASSET_NOT_FOUND", "The audio asset file was not found.") from error
    except (OSError, ValueError, RuntimeError) as error:
        raise _unsafe() from error
    _validate_wav(raw)
    return raw
