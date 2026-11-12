from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import main
from app.contracts import validate_document


@pytest.fixture
def client(tmp_path: Path):
    assert hasattr(main, "create_app"), "Tests require an isolated app database"
    with TestClient(main.create_app(tmp_path / "api.sqlite3")) as client:
        yield client


def test_health(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok", "service": "aether-dom-api", "schemaVersion": "0.2.0",
        "supportedSchemaVersions": ["0.1.0", "0.2.0"],
    }


def test_fixture_is_valid_and_unchanged(client: TestClient) -> None:
    response = client.get("/api/v1/fixtures/neon-shogun")
    assert response.status_code == 200
    document = response.json()
    assert validate_document(document) == []
    assert document["project"]["revision"] == 0
    assert document["characters"][0]["name"] == "Kael"
    document["project"]["revision"] = 10
    assert client.get("/api/v1/fixtures/neon-shogun").json()["project"]["revision"] == 0


@pytest.mark.parametrize("method", ["post", "put", "patch", "delete"])
@pytest.mark.parametrize("path", ["/api/v1/health", "/api/v1/fixtures/neon-shogun"])
def test_routes_reject_writes(client: TestClient, method: str, path: str) -> None:
    assert getattr(client, method)(path).status_code == 405


def test_unknown_fixture(client: TestClient) -> None:
    assert client.get("/api/v1/fixtures/missing").status_code == 404
