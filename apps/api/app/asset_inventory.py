"""Contained local availability adapter; no media reads and no network access."""

from pathlib import Path, PurePosixPath
from typing import Any
from urllib.parse import urlsplit


def inspect_assets(document: dict[str, Any], root: Path) -> dict[str, str]:
    """Only probe clean relative paths under the workspace's assets directory."""
    result = {}
    workspace = root.resolve()
    for asset in sorted(document.get("assets", []), key=lambda value: value["id"]):
        uri = asset.get("uri", "")
        status = "unsafe"
        try:
            parsed = urlsplit(uri)
            if parsed.scheme.lower() in {"http", "https"} and parsed.netloc:
                status = "external"
            elif (
                not parsed.scheme
                and not parsed.netloc
                and not parsed.query
                and not parsed.fragment
                and "\\" not in uri
                and "%" not in uri
                and ":" not in uri
                and not any(ord(char) < 32 for char in uri)
            ):
                path = PurePosixPath(uri)
                if (
                    not path.is_absolute()
                    and len(path.parts) > 1
                    and path.parts[0] == "assets"
                    and ".." not in path.parts
                ):
                    trusted_root = workspace / "assets"
                    assets_root = trusted_root.resolve()
                    if assets_root == trusted_root:
                        target = (workspace / Path(*path.parts)).resolve()
                        if target.is_relative_to(assets_root):
                            status = "present" if target.is_file() else "missing"
        except (OSError, ValueError, RuntimeError):
            status = "unsafe"
        result[asset["id"]] = status
    return result
