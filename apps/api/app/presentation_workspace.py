"""Trusted, quiescent local workspace preparation/recovery; not a hostile FS sandbox.

All cooperating Repository owners hold shared OS locks for their lifetime. Operators
must stop manual/noncooperating SQLite and media writers before maintenance.
"""

import argparse
import hashlib
import importlib
import json
import os
import re
import sqlite3
import stat
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]


def safe_path(path: Path) -> Path:
    absolute = path.absolute()
    for parent in [*reversed(absolute.parents), absolute]:
        if not parent.exists() and not parent.is_symlink():
            continue
        info = parent.lstat()
        if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & 1024:
            raise RuntimeError(f"Redirect refused: {parent}")
    if absolute.resolve() != absolute:
        raise RuntimeError("Aliased path refused")
    return absolute


class Gate:
    def __init__(self, root: Path, *, exclusive: bool = False):
        self.root, self.exclusive = safe_path(root), exclusive
        self.file: Any = None

    def __enter__(self) -> "Gate":
        lock = safe_path(self.root / ".maintenance.lock")
        if lock.exists() and (not lock.is_file() or lock.stat().st_nlink != 1):
            raise RuntimeError("Unsafe maintenance lock")
        self.file = lock.open("a+b")
        try:
            if os.name == "nt":
                import ctypes
                import msvcrt
                from ctypes import wintypes

                class Overlapped(ctypes.Structure):
                    _fields_ = [
                        ("Internal", ctypes.c_size_t),
                        ("InternalHigh", ctypes.c_size_t),
                        ("Offset", wintypes.DWORD),
                        ("OffsetHigh", wintypes.DWORD),
                        ("hEvent", wintypes.HANDLE),
                    ]

                self.overlapped = Overlapped()
                self.handle = msvcrt.get_osfhandle(self.file.fileno())
                kernel = ctypes.WinDLL("kernel32", use_last_error=True)
                kernel.LockFileEx.argtypes = [
                    wintypes.HANDLE,
                    wintypes.DWORD,
                    wintypes.DWORD,
                    wintypes.DWORD,
                    wintypes.DWORD,
                    ctypes.c_void_p,
                ]
                if not kernel.LockFileEx(
                    self.handle,
                    1 | (2 if self.exclusive else 0),
                    0,
                    1,
                    0,
                    ctypes.byref(self.overlapped),
                ):
                    raise OSError(ctypes.get_last_error(), "Workspace lock unavailable")
            else:
                fcntl: Any = importlib.import_module("fcntl")

                fcntl.flock(
                    self.file.fileno(),
                    (fcntl.LOCK_EX if self.exclusive else fcntl.LOCK_SH) | fcntl.LOCK_NB,
                )
        except OSError as error:
            self.file.close()
            self.file = None
            raise RuntimeError(
                "Stop workspace owners before maintenance (or maintenance is active)"
            ) from error
        return self

    def __exit__(self, *args: Any) -> None:
        if self.file is not None:
            self.file.close()  # OS releases the lock even on process exit/crash.
            self.file = None


def configured_owner(database: Path, assets: Path) -> Gate | None:
    identity = os.environ.get("AETHER_PRESENTATION_WORKSPACE")
    if identity is None:
        return None
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,79}", identity):
        raise RuntimeError("Invalid presentation workspace identity")
    root = safe_path(ROOT / "data/presentation/workspaces" / identity)
    if safe_path(database) != root / "workspace.sqlite3" or safe_path(assets) != root:
        raise RuntimeError("Presentation database/assets must match fixed workspace paths")
    return Gate(root).__enter__()


def safe_tree(root: Path) -> dict[str, dict[str, Any]]:
    safe_path(root)
    output: dict[str, dict[str, Any]] = {}
    for path in sorted(root.rglob("*")):
        safe_path(path)
        info = path.lstat()
        if path.is_dir():
            continue
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
            raise RuntimeError("Only standalone regular media files are allowed")
        if info.st_size > 64 * 1024 * 1024 or len(output) >= 10000:
            raise RuntimeError("Media tree bounds exceeded")
        raw = path.read_bytes()
        after = path.stat()
        if (info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns) != (
            after.st_ino,
            after.st_size,
            after.st_mtime_ns,
            after.st_ctime_ns,
        ):
            raise RuntimeError("Media changed during inspection")
        digest = hashlib.sha256(raw).hexdigest()
        if re.fullmatch(r"[a-f0-9]{64}", path.stem) and path.stem != digest:
            raise RuntimeError(f"Content-addressed media hash mismatch: {path}")
        output[path.relative_to(root).as_posix()] = {"sha256": digest, "size": len(raw)}
    return output


def workspace_identity(root: Path) -> tuple[str, str]:
    manifest = safe_path(root / "workspace.json")
    if (
        not manifest.is_file()
        or manifest.stat().st_nlink != 1
        or manifest.stat().st_size > 8 * 1024 * 1024
    ):
        raise RuntimeError("Invalid application workspace manifest")
    try:
        value = json.loads(manifest.read_text(encoding="utf-8"))
        project, branch = value["projectId"], value["branchId"]
        if not all(
            isinstance(item, str) and re.fullmatch(r"[A-Za-z0-9_-]{1,128}", item)
            for item in (project, branch)
        ):
            raise ValueError("Invalid identity")
    except (ValueError, TypeError, KeyError) as error:
        raise RuntimeError("Invalid application project/branch identity") from error
    return project, branch


def inspect_application(
    connection: sqlite3.Connection, identity: tuple[str, str]
) -> dict[str, Any]:
    """Validate existing application schema and saved heads, without opening Repository."""
    from app.contracts import validate_document
    from app.persistence.tables import metadata

    for table in metadata.sorted_tables:
        quoted = '"' + table.name.replace('"', '""') + '"'
        columns = {row[1] for row in connection.execute(f"pragma table_info({quoted})")}
        if not {column.name for column in table.columns}.issubset(columns):
            raise RuntimeError(f"Missing or incomplete application schema: {table.name}")
    try:
        migration = connection.execute("select version_num from alembic_version").fetchall()
    except sqlite3.DatabaseError as error:
        raise RuntimeError("Missing application migration state") from error
    if migration != [("0004",)]:
        raise RuntimeError("Unsupported application migration state; no migration was performed")
    branches = connection.execute("select project_id, branch_id, revision from branches").fetchall()
    if sum((row[0], row[1]) == identity for row in branches) != 1:
        raise RuntimeError("Declared application project/branch does not exist")
    selected: dict[str, Any] = {}
    for project, branch, revision in branches:
        if type(revision) is not int or not 0 <= revision <= 9007199254740991:
            raise RuntimeError("Invalid application branch revision")
        snapshots = connection.execute(
            "select document from snapshots where project_id=? and branch_id=? and revision=?",
            (project, branch, revision),
        ).fetchall()
        if len(snapshots) != 1:
            raise RuntimeError("Missing or ambiguous application current snapshot")
        try:
            document = json.loads(snapshots[0][0])
        except (ValueError, TypeError) as error:
            raise RuntimeError("Invalid canonical snapshot JSON") from error
        if validate_document(document):
            raise RuntimeError("Invalid canonical application snapshot")
        saved_project = document["project"]
        heads = [item for item in document["branches"] if item["id"] == branch]
        if (
            (saved_project["id"], saved_project["activeBranchId"], saved_project["revision"])
            != (project, branch, revision)
            or len(heads) != 1
            or heads[0]["headRevision"] != revision
        ):
            raise RuntimeError("Application snapshot project/branch/revision identity mismatch")
        if (project, branch) == identity:
            selected = {
                "projectId": project,
                "branchId": branch,
                "revision": revision,
                "schemaVersion": document["schemaVersion"],
            }
    return selected


def inspect_database(
    database: Path,
    root: Path,
    identity: tuple[str, str] | None = None,
) -> dict[str, Any]:
    safe_path(database)
    if not database.is_file() or database.stat().st_nlink != 1:
        raise RuntimeError("Missing standalone workspace database")
    refs: set[str] = set()
    expected: dict[str, str] = {}

    def visit(value: Any) -> None:
        if isinstance(value, dict):
            if isinstance(value.get("uri"), str) and isinstance(value.get("sha256"), str):
                if value["uri"] in expected and expected[value["uri"]] != value["sha256"]:
                    raise RuntimeError("Conflicting historical media hashes")
                expected[value["uri"]] = value["sha256"]
            for item in value.values():
                visit(item)
        elif isinstance(value, list):
            for item in value:
                visit(item)
        elif isinstance(value, str) and value.startswith("assets/"):
            if "\\" in value or any(p in ("", ".", "..") or ":" in p for p in value.split("/")):
                raise RuntimeError("Unsafe historical media reference")
            refs.add(value)

    logical = hashlib.sha256()
    with sqlite3.connect(database.as_uri() + "?mode=ro", uri=True, timeout=1) as connection:
        connection.execute("BEGIN")
        if connection.execute("pragma integrity_check").fetchall() != [("ok",)]:
            raise RuntimeError("SQLite integrity check failed")
        application = inspect_application(connection, identity) if identity is not None else None
        tables = connection.execute("select name from sqlite_master where type='table'").fetchall()
        for (table,) in sorted(tables):
            logical.update(table.encode())
            quoted = '"' + table.replace('"', '""') + '"'
            rows = connection.execute(f"select * from {quoted}").fetchall()
            for row in sorted(rows, key=repr):
                logical.update(repr(row).encode())
                for value in row:
                    if isinstance(value, str):
                        try:
                            visit(json.loads(value))
                        except (ValueError, TypeError):
                            pass
    media = safe_tree(root / "assets") if (root / "assets").exists() else {}
    for ref in refs:
        entry = media.get(ref.removeprefix("assets/"))
        if entry is None:
            raise RuntimeError(f"Missing historical media: {ref}")
        if ref in expected and expected[ref] != entry["sha256"]:
            raise RuntimeError(f"Historical media hash mismatch: {ref}")
    result = {
        "integrity": "ok",
        "logicalSha256": logical.hexdigest(),
        "references": sorted(refs),
        "media": media,
    }
    if application is not None:
        result["application"] = application
    return result


def backup(
    root: Path,
    destination: Path,
    identity: tuple[str, str] | None = None,
) -> dict[str, Any]:
    with Gate(root, exclusive=True):
        before = inspect_database(root / "workspace.sqlite3", root, identity)
        # Probe external SQLite write contention with a finite timeout, then use a
        # separate read connection for backup. This is not universal writer detection.
        with sqlite3.connect(root / "workspace.sqlite3", timeout=1) as probe:
            probe.execute("BEGIN IMMEDIATE")
            probe.rollback()
        safe_path(destination)
        target = destination / "workspace.sqlite3"
        if target.exists():
            raise RuntimeError("Backup database already exists")
        with (
            sqlite3.connect(
                (root / "workspace.sqlite3").as_uri() + "?mode=ro", uri=True, timeout=1
            ) as source,
            sqlite3.connect(target) as copied,
        ):
            deadline = time.monotonic() + 15

            def progress(status: int, remaining: int, total: int) -> None:
                if time.monotonic() > deadline:
                    raise RuntimeError("SQLite online backup timed out")

            source.backup(copied, pages=256, sleep=0.01, progress=progress)
        for name in before["media"]:
            source_path, dest = root / "assets" / name, destination / "assets" / name
            safe_path(dest)
            dest.parent.mkdir(parents=True, exist_ok=True)
            with dest.open("xb") as handle:
                handle.write(source_path.read_bytes())
        after = inspect_database(root / "workspace.sqlite3", root, identity)
        if before != after or inspect_database(target, destination, identity) != before:
            raise RuntimeError("Workspace changed during backup; incomplete output retained")
        return before


def restore(
    root: Path,
    source: Path,
    identity: tuple[str, str] | None = None,
) -> dict[str, Any]:
    with Gate(root, exclusive=True):
        inspection = inspect_database(source / "workspace.sqlite3", source, identity)
        for name in ["workspace.sqlite3", *["assets/" + name for name in inspection["media"]]]:
            original, target = safe_path(source / name), safe_path(root / name)
            target.parent.mkdir(parents=True, exist_ok=True)
            with target.open("xb") as handle:
                handle.write(original.read_bytes())
        current = inspect_database(root / "workspace.sqlite3", root, identity)
        if current != inspection:
            raise RuntimeError("Restored inspection mismatch")
        return current


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["setup", "inspect", "backup", "restore"])
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--destination", type=Path)
    parser.add_argument("--with-reviewed-job", action="store_true")
    args = parser.parse_args()
    if args.command == "setup":
        from app.presentation_seed import prepare

        result = prepare(args.root, args.with_reviewed_job)
    elif args.command in {"backup", "restore"}:
        if args.destination is None:
            parser.error("backup requires destination")
        selected_root = args.root if args.command == "backup" else args.destination
        identity = workspace_identity(selected_root)
        result = (backup if args.command == "backup" else restore)(
            args.root,
            args.destination,
            identity,
        )
    else:
        with Gate(args.root):
            result = inspect_database(
                args.root / "workspace.sqlite3", args.root, workspace_identity(args.root)
            )
    print(json.dumps(result))


if __name__ == "__main__":
    main()
