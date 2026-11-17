import json
import os
import re
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Any, Literal, cast

from fastapi import Body, Depends, FastAPI, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.asset_evidence import inspect_asset
from app.asset_inventory import inspect_assets
from app.command_body import command_body
from app.commands import CommandError
from app.contracts import SCHEMA_VERSION, SUPPORTED_SCHEMA_VERSIONS, load_fixture
from app.job_routes import job_router
from app.linter import analyze_document
from app.proposal_provider import ProposalProvider
from app.repository import Repository
from app.svg_assets import SvgAssetError


class Health(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["aether-dom-api"] = "aether-dom-api"
    schemaVersion: str = SCHEMA_VERSION
    supportedSchemaVersions: list[str] = SUPPORTED_SCHEMA_VERSIONS
    presentationWorkspace: str | None = None
    presentationInstance: str | None = None


def create_app(
    database_path: Path | None = None, asset_root: Path | None = None,
    proposal_provider: ProposalProvider | None = None,
) -> FastAPI:
    repository = Repository(database_path, asset_root, proposal_provider)

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
            asset_evidence={asset["id"]: inspect_asset(asset, repository.asset_root,
                                                     repository.asset_store)
                            for asset in document["assets"] if "provenance" in asset},
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

    @app.get("/api/v1/health", response_model=Health, response_model_exclude_none=True)
    def health(response: Response) -> Health:
        response.headers["Cache-Control"] = "no-store"
        return Health(presentationWorkspace=os.environ.get("AETHER_PRESENTATION_WORKSPACE"),
                      presentationInstance=os.environ.get("AETHER_PRESENTATION_INSTANCE"))

    @app.get("/api/v1/fixtures/neon-shogun")
    def fixture(response: Response) -> dict[str, Any]:
        response.headers["Cache-Control"] = "no-store"
        return load_fixture()

    @app.get("/api/v1/fixtures/articulated-rig")
    def articulated_fixture(response: Response) -> dict[str, Any]:
        response.headers["Cache-Control"] = "no-store"
        root = Path(__file__).resolve().parents[3] / "assets" / "fixtures"
        return {"templateVersion": "1.0.0", "name": "Kael-inspired rig",
                "svg": (root / "kael-articulated.svg").read_text(encoding="utf-8"),
                "rig": json.loads((root / "kael-articulated.rig.json").read_text(encoding="utf-8"))}

    @app.get("/api/v1/projects/{project_id}/branches/{branch_id}/document")
    def document(project_id: str, branch_id: str, response: Response) -> dict[str, Any]:
        response.headers["Cache-Control"] = "no-store"
        return decorate(repository.get(project_id, branch_id))

    @app.get("/api/v1/projects/{project_id}/branches")
    def branch_list(project_id: str, response: Response) -> dict[str, Any]:
        response.headers["Cache-Control"] = "no-store"
        return repository.list_branches(project_id)

    @app.post("/api/v1/projects/{project_id}/branches")
    def fork_branch(
        project_id: str, response: Response, payload: Annotated[Any, Body()],
    ) -> dict[str, Any]:
        response.headers["Cache-Control"] = "no-store"
        return repository.fork_branch(project_id, payload)

    @app.get("/api/v1/projects/{project_id}/diff")
    def branch_diff(project_id: str, request: Request, response: Response) -> dict[str, Any]:
        pairs = list(request.query_params.multi_items())
        if len(pairs) != 2 or {key for key, _ in pairs} != {"left", "right"}:
            raise CommandError(422, "INVALID_BRANCH_QUERY", "Comparison requires left and right")
        response.headers["Cache-Control"] = "no-store"
        return repository.diff_branches(project_id, request.query_params["left"],
                                        request.query_params["right"])

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

    @app.get("/api/v1/projects/{project_id}/branches/{branch_id}/assets/{asset_id}/ledger")
    def asset_ledger(project_id: str, branch_id: str, asset_id: str,
                     request: Request, response: Response) -> dict[str, Any]:
        query = list(request.query_params.multi_items())
        if (len(query) != 1 or query[0][0] != "revision"
                or not re.fullmatch(r"0|[1-9][0-9]{0,15}", query[0][1])
                or int(query[0][1]) > 9007199254740991
                or any(not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", identity)
                       for identity in (project_id, branch_id))
                or asset_id in (".", "..") or not 1 <= len(asset_id) <= 128
                or any(char in "/\\" or ord(char) < 32 or 0xD800 <= ord(char) <= 0xDFFF
                       for char in asset_id)):
            raise CommandError(422, "INVALID_LEDGER_REQUEST", "Invalid ledger identity or revision")
        response.headers["Cache-Control"] = "no-store"
        return repository.get_asset_ledger(project_id, branch_id, asset_id, int(query[0][1]))

    @app.get("/api/v1/projects/{project_id}/branches/{branch_id}/player-manifest")
    def player_manifest(project_id: str, branch_id: str, request: Request) -> JSONResponse:
        query = list(request.query_params.multi_items())
        if (any(key not in {"revision", "download", "use"} for key, _ in query)
                or len({key for key, _ in query}) != len(query)
                or any(not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", identity)
                       for identity in (project_id, branch_id))):
            raise CommandError(422, "INVALID_MANIFEST_REQUEST",
                               "Invalid manifest identity or query")
        revision_text = request.query_params.get("revision")
        download = request.query_params.get("download")
        export_use = request.query_params.get("use", "private_preview")
        if ((revision_text is not None and (not re.fullmatch(r"0|[1-9][0-9]{0,15}", revision_text)
                                           or int(revision_text) > 9007199254740991))
                or (download is not None and download != "1")
                or export_use not in {"private_preview", "public_distribution", "commercial_pack"}):
            raise CommandError(422, "INVALID_MANIFEST_REQUEST", "Invalid revision or download flag")
        manifest = repository.get_player_manifest(
            project_id, branch_id, int(revision_text) if revision_text is not None else None,
            export_use,
        )
        headers = {"Cache-Control": "no-store"}
        if download:
            revision = manifest["document"]["project"]["revision"]
            headers["Content-Disposition"] = (
                f'attachment; filename="aether-dom-r{revision}.cdom.json"'
            )
        return JSONResponse(content=manifest, headers=headers)

    @app.post("/api/v1/projects/{project_id}/branches/{branch_id}/commands")
    def execute(
        project_id: str, branch_id: str, response: Response,
        payload: Annotated[object, Depends(command_body)],
    ) -> dict[str, Any]:
        response.headers["Cache-Control"] = "no-store"
        return decorate(repository.execute(project_id, branch_id, payload))

    @app.get("/api/v1/projects/{project_id}/branches/{branch_id}/agent-proposals")
    def proposals(project_id: str, branch_id: str, response: Response) -> dict[str, Any]:
        response.headers["Cache-Control"] = "no-store"
        return {"proposals": repository.list_proposals(project_id, branch_id)}

    @app.post("/api/v1/projects/{project_id}/branches/{branch_id}/agent-proposals")
    def propose(
        project_id: str, branch_id: str, response: Response, payload: Annotated[Any, Body()],
    ) -> dict[str, Any]:
        response.headers["Cache-Control"] = "no-store"
        return repository.create_proposal(project_id, branch_id, payload)

    @app.post("/api/v1/projects/{project_id}/branches/{branch_id}/agent-proposals/{proposal_id}/reject")
    def reject_proposal(
        project_id: str, branch_id: str, proposal_id: str, response: Response,
        payload: Annotated[Any, Body()],
    ) -> dict[str, Any]:
        response.headers["Cache-Control"] = "no-store"
        if not isinstance(payload, dict) or payload:
            raise CommandError(
                422, "INVALID_PROPOSAL_DECISION", "Reject requires an empty JSON object",
            )
        return repository.reject_proposal(project_id, branch_id, proposal_id)

    app.include_router(job_router(repository))
    return app


app = create_app()
