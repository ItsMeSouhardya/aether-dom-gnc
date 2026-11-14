"""Windows evidence I/O relative to verified handles, never a mutable pathname."""

import ctypes
import os
import sys
from ctypes import wintypes
from typing import Any, cast


class _Unicode(ctypes.Structure):
    _fields_ = [
        ("length", wintypes.USHORT),
        ("maximum", wintypes.USHORT),
        ("buffer", ctypes.c_void_p),
    ]


class _Attributes(ctypes.Structure):
    _fields_ = [
        ("length", wintypes.ULONG),
        ("root", wintypes.HANDLE),
        ("name", ctypes.POINTER(_Unicode)),
        ("flags", wintypes.ULONG),
        ("security", ctypes.c_void_p),
        ("qos", ctypes.c_void_p),
    ]


class _Status(ctypes.Structure):
    _fields_ = [("status", ctypes.c_void_p), ("information", ctypes.c_size_t)]


class NativeEvidence:
    kernel: Any
    native: Any

    def __init__(self) -> None:
        if sys.platform != "win32":
            raise OSError("Windows evidence handles are only available on Windows")
        self.kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        self.native = ctypes.WinDLL("ntdll", use_last_error=True)
        self.files: dict[str, tuple[int, bool]] = {}

    def check(self, result: int) -> None:
        if result != 0:
            if sys.platform != "win32":
                raise OSError("Windows native operation failed")
            translate = self.native.RtlNtStatusToDosError
            translate.argtypes, translate.restype = [wintypes.LONG], wintypes.ULONG
            raise ctypes.WinError(translate(result))

    def close_handle(self, handle: int) -> None:
        close = self.kernel.CloseHandle
        close.argtypes, close.restype = [wintypes.HANDLE], wintypes.BOOL
        close(handle)

    def relative(self, parent: int, name: str, access: int, disposition: int, options: int) -> int:
        if not name or name in (".", "..") or any(char in name for char in "/\\:"):
            raise OSError("Handle-relative I/O requires a single child name")
        encoded = name.encode("utf-16-le")
        buffer = ctypes.create_string_buffer(encoded + b"\0\0")
        unicode = _Unicode(len(encoded), len(encoded) + 2, ctypes.addressof(buffer))
        # OBJ_DONT_REPARSE fails closed if the held directory was converted in place.
        attributes = _Attributes(
            ctypes.sizeof(_Attributes), parent, ctypes.pointer(unicode), 0x40 | 0x1000, None, None
        )
        opened, status = wintypes.HANDLE(), _Status()
        create = self.native.NtCreateFile
        create.argtypes = [
            ctypes.POINTER(wintypes.HANDLE),
            wintypes.DWORD,
            ctypes.POINTER(_Attributes),
            ctypes.POINTER(_Status),
            ctypes.c_void_p,
            wintypes.ULONG,
            wintypes.ULONG,
            wintypes.ULONG,
            wintypes.ULONG,
            ctypes.c_void_p,
            wintypes.ULONG,
        ]
        create.restype = wintypes.LONG
        # SYNCHRONIZE + FILE_SYNCHRONOUS_IO_NONALERT; READ sharing only.
        self.check(
            create(
                ctypes.byref(opened),
                access | 0x100000,
                ctypes.byref(attributes),
                ctypes.byref(status),
                None,
                0x80,
                0x1,
                disposition,
                options | 0x20 | 0x200000,
                None,
                0,
            )
        )
        return cast(int, opened.value)

    def directory(self, parent: int, name: str) -> int:
        # FILE_OPEN_IF and FILE_DIRECTORY_FILE; parent authority is already held.
        return self.relative(parent, name, 0x1 | 0x80, 3, 0x1)

    def create(self, parent: int, name: str) -> int:
        if sys.platform != "win32":
            raise OSError("Windows evidence handles are only available on Windows")
        import msvcrt

        # FILE_CREATE, FILE_NON_DIRECTORY_FILE, GENERIC_WRITE|DELETE.
        handle = self.relative(parent, name, 0x40000000 | 0x10000, 2, 0x40)
        self.files[name] = (handle, False)
        duplicate = self.kernel.DuplicateHandle
        duplicate.argtypes = [
            wintypes.HANDLE,
            wintypes.HANDLE,
            wintypes.HANDLE,
            ctypes.POINTER(wintypes.HANDLE),
            wintypes.DWORD,
            wintypes.BOOL,
            wintypes.DWORD,
        ]
        duplicate.restype = wintypes.BOOL
        current = self.kernel.GetCurrentProcess
        current.argtypes, current.restype = [], wintypes.HANDLE
        process, copied = current(), wintypes.HANDLE()
        if not duplicate(process, handle, process, ctypes.byref(copied), 0, False, 2):
            error = ctypes.WinError(ctypes.get_last_error())
            self.remove(name)
            raise error
        try:
            # The CRT closes only its duplicate; the exact source authority stays held.
            return msvcrt.open_osfhandle(cast(int, copied.value), os.O_WRONLY | os.O_BINARY)
        except OSError:
            self.close_handle(cast(int, copied.value))
            self.remove(name)
            raise

    def set_information(self, handle: int, buffer: Any, kind: int) -> None:
        change = self.native.NtSetInformationFile
        change.argtypes = [
            wintypes.HANDLE,
            ctypes.POINTER(_Status),
            ctypes.c_void_p,
            wintypes.ULONG,
            ctypes.c_int,
        ]
        change.restype = wintypes.LONG
        status = _Status()
        self.check(
            change(handle, ctypes.byref(status), ctypes.byref(buffer), ctypes.sizeof(buffer), kind)
        )

    def publish(self, temporary: str, destination: str) -> None:
        if (
            not destination
            or destination in (".", "..")
            or any(char in destination for char in "/\\:")
        ):
            raise OSError("Publication requires a simple leaf name")

        class Rename(ctypes.Structure):
            _fields_ = [
                ("replace", wintypes.DWORD),
                ("root", wintypes.HANDLE),
                ("length", wintypes.DWORD),
                ("name", wintypes.WCHAR * 1),
            ]

        encoded = destination.encode("utf-16-le")
        buffer = ctypes.create_string_buffer(Rename.name.offset + len(encoded))
        info = Rename.from_buffer(buffer)
        info.replace, info.root, info.length = 0, None, len(encoded)
        ctypes.memmove(ctypes.addressof(buffer) + Rename.name.offset, encoded, len(encoded))
        handle, _ = self.files[temporary]
        self.set_information(handle, buffer, 10)  # Same parent, no replace, no pathname reopen.
        self.files[temporary] = (handle, True)

    def remove(self, temporary: str) -> None:
        saved = self.files.pop(temporary, None)
        if saved is None:
            return
        handle, published = saved
        try:
            if not published:
                self.set_information(handle, ctypes.c_ubyte(1), 13)  # Delete exact temporary.
        finally:
            self.close_handle(handle)

    def close(self) -> None:
        try:
            for name in list(self.files):
                self.remove(name)
        finally:
            # Close every remaining authority even if one disposition failed.
            for handle, _ in self.files.values():
                self.close_handle(handle)
            self.files.clear()
