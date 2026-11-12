from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Any, Literal, cast

from fastapi import Body, FastAPI, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.asset_inventory import inspect_assets
from app.commands import CommandError
from app.contracts import SCHEMA_VERSION, SUPPORTED_SCHEMA_VERSIONS, load_fixture
from app.linter import analyze_document
from app.repository import Repository
from app.svg_assets import SvgAssetError


class Health(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["aether-dom-api"] = "aether-dom-api"
    schemaVersion: str = SCHEMA_VERSION
    supportedSchemaVersions: list[str] = SUPPORTED_SCHEMA_VERSIONS


def create_app(database_path: Path | None = None, asset_root: Path | None = None) -> FastAPI:
    repository = Repository(database_path, asset_root)

    def decorate(result: dict[str, Any]) -> dict[str, Any]:
        # Derived analysis never enters snapshots or immutable command results.
        # Analyze this exact response snapshot, including historical idempotent replays.
        document = result["document"]
        changed_ids = result.get("receipt", {}).get("changedEntityIds", ())
        previous = repository.revision_document(
            document["project"]["id"], document["project"]["activeBranchId"],
            document["project"]["revision"] - 1,
        ) if "receipt" in result else None
        return {**result, "analysis": analyze_document(
            document, changed_entity_ids=changed_ids,
            asset_status=inspect_assets(document, repository.asset_root),
            previous_document=previous,
        )}

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        repository.initialize()
        try:
            yield
        finally:
            repository.close()

    app = FastAPI(title="AETHER-DOM API", version="0.1.0", lifespan=lifespan)

    @app.exception_handler(SvgAssetError)
    async def svg_error(request: Request, error: SvgAssetError) -> JSONResponse:
        return JSONResponse(status_code=error.status, content={"detail": {
            "code": error.code, "message": error.message,
        }}, headers={"Cache-Control": "no-store"})

    @app.exception_handler(CommandError)
    async def command_error(request: Request, error: CommandError) -> JSONResponse:
        return JSONResponse(status_code=error.status, content={"detail": error.detail},
                            headers={"Cache-Control": "no-store"})

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request: Request, error: RequestValidationError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": {
            "code": "INVALID_COMMAND", "message": "A valid JSON command body is required",
        }}, headers={"Cache-Control": "no-store"})

    @app.get("/api/v1/health", response_model=Health)
    def health(response: Response) -> Health:
        response.headers["Cache-Control"] = "no-store"
        return Health()

    @app.get("/api/v1/fixtures/neon-shogun")
    def fixture(response: Response) -> dict[str, Any]:
        response.headers["Cache-Control"] = "no-store"
        return load_fixture()

    @app.get("/api/v1/projects/{project_id}/branches/{branch_id}/document")
    def document(project_id: str, branch_id: str, response: Response) -> dict[str, Any]:
        response.headers["Cache-Control"] = "no-store"
        return decorate(repository.get(project_id, branch_id))

    @app.get("/api/v1/projects/{project_id}/branches/{branch_id}/diagnostics")
    def diagnostics(project_id: str, branch_id: str, response: Response) -> dict[str, Any]:
        response.headers["Cache-Control"] = "no-store"
        return cast(dict[str, Any], decorate(repository.get(project_id, branch_id))["analysis"])

    @app.get("/api/v1/projects/{project_id}/branches/{branch_id}/assets/{asset_id}")
    def svg_asset(
        project_id: str, branch_id: str, asset_id: str, response: Response,
        revision: int | None = None,
    ) -> dict[str, Any]:
        response.headers["Cache-Control"] = "no-store"
        return repository.get_svg_asset(project_id, branch_id, asset_id, revision)

    @app.get("/api/v1/projects/{project_id}/branches/{branch_id}/audio/{asset_id}")
    def audio_asset(
        project_id: str, branch_id: str, asset_id: str,
        revision: Annotated[int | None, Query(ge=0, le=9007199254740991)] = None,
    ) -> Response:
        raw = repository.get_audio_asset(project_id, branch_id, asset_id, revision)
        return Response(content=raw, media_type="audio/wav", headers={
            "Cache-Control": "no-store", "Content-Length": str(len(raw)),
        })

    @app.post("/api/v1/projects/{project_id}/branches/{branch_id}/commands")
    def execute(
        project_id: str, branch_id: str, response: Response, payload: Annotated[Any, Body()],
    ) -> dict[str, Any]:
        response.headers["Cache-Control"] = "no-store"
        return decorate(repository.execute(project_id, branch_id, payload))

    return app


app = create_app()
