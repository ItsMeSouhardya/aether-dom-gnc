"""Bounded binary reads expose only saved audio references in temporary roots."""
import copy
import io
import os
import struct
import subprocess
import wave
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, update

from app.commands import CommandError
from app.main import create_app
from app.persistence.tables import snapshots
from app.repository import Repository
from tests.test_stage_api import BASE, command


def wav(*, channels: int = 1, rate: int = 8000, width: int = 2,
        frames: int = 80) -> bytes:
    output = io.BytesIO()
    with wave.open(output, "wb") as source:
        source.setparams((channels, width, rate, frames, "NONE", "not compressed"))
        source.writeframes(bytes(channels * width * frames))
    return output.getvalue()


def write_wav(root: Path, raw: bytes | None = None) -> Path:
    path = root / "assets/fixtures/ambient.wav"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(wav() if raw is None else raw)
    return path


def mutate_snapshot(repository: Repository, mutate: Any, revision: int = 0):
    with repository.engine.begin() as connection:
        document = connection.execute(select(snapshots.c.document).where(
            snapshots.c.revision == revision,
        )).scalar_one()
        document = copy.deepcopy(document)
        mutate(document)
        connection.execute(update(snapshots).where(snapshots.c.revision == revision).values(
            document=document,
        ))


def test_route_reads_exact_audio_bytes_headers_and_errors(tmp_path: Path):
    raw = wav(channels=2, rate=48000)
    write_wav(tmp_path, raw)
    with TestClient(create_app(tmp_path / "audio.sqlite3", asset_root=tmp_path)) as client:
        response = client.get(BASE + "/audio/asset_ambient?revision=0")
        assert response.status_code == 200
        assert response.content == raw
        assert response.headers["content-type"] == "audio/wav"
        assert response.headers["cache-control"] == "no-store"
        assert response.headers["content-length"] == str(len(raw))
        assert client.get(BASE + "/audio/asset_ambient").content == raw
        for suffix in ["asset_missing", "asset_sign", "asset_tension", "asset_ambient?revision=99"]:
            response = client.get(BASE + "/audio/" + suffix)
            assert response.status_code == 404
            assert response.headers["cache-control"] == "no-store"
        for revision in ["-1", "1.5", "no", "9007199254740992"]:
            assert client.get(BASE + "/audio/asset_ambient?revision=" + revision).status_code == 422
        missing = BASE.replace("branch_main", "missing") + "/audio/asset_ambient"
        assert client.get(missing).status_code == 404


def test_repository_read_uses_saved_revision_and_requires_audio_track_reference(tmp_path: Path):
    write_wav(tmp_path)
    repository = Repository(tmp_path / "audio.sqlite3", asset_root=tmp_path)
    repository.initialize()
    try:
        repository.execute("proj_neon_shogun", "branch_main", command(
            0, "setLayerTransform", x=0.2,
        ))
        mutate_snapshot(repository, lambda doc: doc["assets"][-3].update(
            uri="assets/fixtures/missing.wav",
        ), revision=1)
        raw = repository.get_audio_asset("proj_neon_shogun", "branch_main", "asset_ambient", 0)
        assert raw == wav()
        with pytest.raises(CommandError) as error:
            repository.get_audio_asset("proj_neon_shogun", "branch_main", "asset_ambient")
        assert error.value.status == 404
        mutate_snapshot(repository, lambda doc: doc["audioTracks"].clear(), revision=0)
        with pytest.raises(CommandError) as error:
            repository.get_audio_asset("proj_neon_shogun", "branch_main", "asset_ambient", 0)
        assert error.value.status == 404
    finally:
        repository.close()


@pytest.mark.parametrize("uri", ["../ambient.wav", "assets/../ambient.wav",
    "https://example.com/a.wav", "//host/a.wav", "file:///a.wav", "C:/a.wav",
    "assets\\ambient.wav", "assets/%2e%2e/a.wav", "assets/fixtures/ambient.wav?x=1",
    "assets/fixtures/ambient.wav#x", "/assets/fixtures/ambient.wav", "assets//fixtures/ambient.wav",
    "assets/./fixtures/ambient.wav", "assets/fixtures/ambient.wav\x00"])
def test_unsafe_saved_audio_uris_are_never_read(tmp_path: Path, uri: str):
    write_wav(tmp_path)
    repository = Repository(tmp_path / "audio.sqlite3", asset_root=tmp_path)
    repository.initialize()
    try:
        mutate_snapshot(repository, lambda doc: doc["assets"][-3].update(uri=uri))
        with pytest.raises(CommandError) as error:
            repository.get_audio_asset("proj_neon_shogun", "branch_main", "asset_ambient", 0)
        assert error.value.status == 422
    finally:
        repository.close()


@pytest.mark.parametrize("raw", [b"", b"RIFF", b"not a wav", wav()[:-1], wav() + b"junk",
    wav(channels=3), wav(rate=7999), wav(rate=48001), wav(width=1),
    wav(frames=0), wav(frames=240001), b"0" * (8 * 1024 * 1024 + 1)])
def test_invalid_or_oversized_audio_is_not_served(tmp_path: Path, raw: bytes):
    write_wav(tmp_path, raw)
    with TestClient(create_app(tmp_path / "audio.sqlite3", asset_root=tmp_path)) as client:
        response = client.get(BASE + "/audio/asset_ambient?revision=0")
        assert response.status_code == 422
        assert response.json()["detail"]["code"] == "INVALID_AUDIO"


@pytest.mark.parametrize("offset,value", [(20, 3), (32, 1), (34, 8)])
def test_wave_format_and_alignment_must_match_pcm16(tmp_path: Path, offset: int, value: int):
    raw = bytearray(wav())
    struct.pack_into("<H", raw, offset, value)
    write_wav(tmp_path, bytes(raw))
    with TestClient(create_app(tmp_path / "audio.sqlite3", asset_root=tmp_path)) as client:
        assert client.get(BASE + "/audio/asset_ambient?revision=0").status_code == 422


def test_hardlinked_audio_is_rejected(tmp_path: Path):
    path = write_wav(tmp_path)
    os.link(path, tmp_path / "another.wav")
    with TestClient(create_app(tmp_path / "audio.sqlite3", asset_root=tmp_path)) as client:
        assert client.get(BASE + "/audio/asset_ambient?revision=0").status_code == 422


@pytest.mark.skipif(os.name != "nt", reason="Windows junction containment")
@pytest.mark.parametrize("redirect", ["root", "assets", "child"])
def test_redirected_audio_storage_is_rejected(tmp_path: Path, redirect: str):
    actual = tmp_path / "actual"
    write_wav(actual)
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    if redirect == "root":
        link, destination = workspace / "root", actual
        root = link
    elif redirect == "assets":
        link, destination = workspace / "assets", actual / "assets"
        root = workspace
    else:
        (workspace / "assets").mkdir()
        link, destination = workspace / "assets/fixtures", actual / "assets/fixtures"
        root = workspace
    subprocess.run(["cmd", "/c", "mklink", "/J", str(link), str(destination)],
                   check=True, capture_output=True)
    with TestClient(create_app(tmp_path / "audio.sqlite3", asset_root=root)) as client:
        response = client.get(BASE + "/audio/asset_ambient?revision=0")
        assert response.status_code == 422
        assert response.json()["detail"]["code"] == "UNSAFE_ASSET_PATH"
