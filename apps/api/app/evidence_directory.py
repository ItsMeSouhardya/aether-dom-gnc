"""Keep evidence publication and cleanup anchored while pathnames may be replaced."""

import ctypes
import os
import secrets
import stat
import sys
from collections.abc import Iterator
from contextlib import contextmanager
from ctypes import wintypes
from pathlib import Path
from typing import cast

from app.windows_evidence import NativeEvidence


@contextmanager
def _windows_directories(directory: Path) -> Iterator[tuple[NativeEvidence, int]]:
    """Acquire only the volume anchor by pathname; all children use held authority.

    Sharing excludes ordinary write/rename as defense in depth. Attribute-only
    in-place reparse conversion remains possible, so NtCreateFile additionally
    uses RootDirectory and OBJ_DONT_REPARSE for every relative child operation.
    """
    if sys.platform != "win32":
        raise OSError("Windows directory handles are only available on Windows")
    native = NativeEvidence()
    create = native.kernel.CreateFileW
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

    class Information(ctypes.Structure):
        _fields_ = [
            ("attributes", wintypes.DWORD),
            ("created", wintypes.FILETIME),
            ("accessed", wintypes.FILETIME),
            ("written", wintypes.FILETIME),
            ("volume", wintypes.DWORD),
            ("size_high", wintypes.DWORD),
            ("size_low", wintypes.DWORD),
            ("links", wintypes.DWORD),
            ("index_high", wintypes.DWORD),
            ("index_low", wintypes.DWORD),
        ]

    information = native.kernel.GetFileInformationByHandle
    information.argtypes = [wintypes.HANDLE, ctypes.POINTER(Information)]
    information.restype = wintypes.BOOL
    handles: list[int] = []
    try:
        anchor = directory.anchor
        if not anchor.startswith("\\\\?\\"):
            anchor = (
                "\\\\?\\UNC\\" + anchor[2:] if anchor.startswith("\\\\") else "\\\\?\\" + anchor
            )
        opened = create(anchor, 0x1, 0x1, None, 3, 0x02000000 | 0x00200000, None)
        if opened == ctypes.c_void_p(-1).value:
            raise ctypes.WinError(ctypes.get_last_error())
        handles.append(cast(int, opened))
        for index in range(len(directory.parts)):
            handle = handles[-1]
            info = Information()
            if not information(handle, ctypes.byref(info)):
                raise ctypes.WinError(ctypes.get_last_error())
            if not info.attributes & 0x10 or info.attributes & 0x400:
                raise OSError("Evidence ancestors must be unredirected directories")
            if index + 1 < len(directory.parts):
                handles.append(native.directory(handle, directory.parts[index + 1]))
        yield native, handles[-1]
    finally:
        try:
            native.close()
        finally:
            for handle in reversed(handles):
                native.close_handle(handle)


class PublicationDirectory:
    def __init__(
        self,
        path: Path,
        descriptor: int | None,
        windows: NativeEvidence | None = None,
        windows_directory: int | None = None,
    ):
        self.path, self.descriptor = path, descriptor
        self.windows, self.windows_directory = windows, windows_directory

    def create(self) -> tuple[int, str]:
        flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_BINARY", 0)
        flags |= getattr(os, "O_NOFOLLOW", 0)
        for _ in range(32):
            name = ".evidence-" + secrets.token_hex(16) + ".tmp"
            try:
                if self.windows is not None and self.windows_directory is not None:
                    return self.windows.create(self.windows_directory, name), name
                if self.descriptor is None:
                    raise OSError("Publication requires a directory authority")
                return os.open(name, flags, 0o600, dir_fd=self.descriptor), name
            except FileExistsError:
                continue
        raise OSError("Cannot allocate an immutable evidence temporary file")

    def publish(self, temporary: str, destination: str) -> None:
        if self.windows is not None:
            self.windows.publish(temporary, destination)
        elif self.descriptor is not None:
            os.link(
                temporary,
                destination,
                src_dir_fd=self.descriptor,
                dst_dir_fd=self.descriptor,
                follow_symlinks=False,
            )
        else:
            raise OSError("Publication requires a directory authority")

    def remove(self, name: str) -> None:
        if self.windows is not None:
            self.windows.remove(name)
            return
        if self.descriptor is None:
            raise OSError("Cleanup requires a directory authority")
        try:
            os.unlink(name, dir_fd=self.descriptor)
        except FileNotFoundError:
            pass


@contextmanager
def publication_directory(root: Path) -> Iterator[PublicationDirectory]:
    directory = root / "assets/evidence"
    if os.name == "nt":
        with _windows_directories(directory) as (native, handle):
            yield PublicationDirectory(directory, None, native, handle)
        return
    # Absolute paths ignore dir_fd. Use only relative child names after opening root.
    descriptors: list[int] = []
    try:
        flags = os.O_RDONLY
        for flag_name in ("O_DIRECTORY", "O_NOFOLLOW", "O_NONBLOCK"):
            flags |= getattr(os, flag_name)
        descriptor = os.open(directory.anchor, flags)
        descriptors.append(descriptor)
        for name in directory.parts[1:]:
            try:
                os.mkdir(name, mode=0o700, dir_fd=descriptor)
            except FileExistsError:
                pass
            descriptor = os.open(name, flags, dir_fd=descriptor)
            descriptors.append(descriptor)
            if not stat.S_ISDIR(os.fstat(descriptor).st_mode):
                raise OSError("Evidence ancestors must be directories")
        yield PublicationDirectory(directory, descriptor)
    finally:
        for descriptor in reversed(descriptors):
            os.close(descriptor)
