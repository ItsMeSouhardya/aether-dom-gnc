"""Fixed bounded job resources; there is deliberately no browser worker trigger."""

from typing import Any

from fastapi import APIRouter, Request, Response

from app.job_domain import ROUTE_ID, invalid, parse_job_body
from app.job_repository import JobRepository
from app.repository import Repository


def job_router(repository: Repository) -> APIRouter:
    router = APIRouter(prefix="/api/v1/projects/{project_id}/branches/{branch_id}/jobs")
    queue = JobRepository(repository)

    def resource(request: Request, response: Response, *ids: str) -> None:
        response.headers["Cache-Control"] = "no-store"
        if request.query_params or any(not ROUTE_ID.fullmatch(value) for value in ids):
            raise invalid("Invalid job resource or query")

    async def body(request: Request, *, decision: bool = False) -> object:
        if request.headers.get("content-type", "").split(";", 1)[0].strip().lower() != (
            "application/json"
        ):
            raise invalid("Job writes require application/json")
        limit = 64 if decision else 8192
        raw = bytearray()
        async for chunk in request.stream():
            raw.extend(chunk)
            if len(raw) > limit:
                raise invalid("Job body is too large")
        return parse_job_body(bytes(raw), decision=decision)

    @router.get("")
    def list_jobs(project_id: str, branch_id: str, request: Request,
                  response: Response) -> dict[str, Any]:
        resource(request, response, project_id, branch_id)
        return {"jobs": queue.list(project_id, branch_id)}

    @router.post("")
    async def enqueue(project_id: str, branch_id: str, request: Request,
                      response: Response) -> dict[str, Any]:
        resource(request, response, project_id, branch_id)
        return queue.enqueue(project_id, branch_id, await body(request))

    @router.get("/{job_id}")
    def get_job(project_id: str, branch_id: str, job_id: str, request: Request,
                response: Response) -> dict[str, Any]:
        resource(request, response, project_id, branch_id, job_id)
        return queue.get(project_id, branch_id, job_id)

    @router.post("/{job_id}/cancel")
    async def cancel(project_id: str, branch_id: str, job_id: str, request: Request,
                     response: Response) -> dict[str, Any]:
        resource(request, response, project_id, branch_id, job_id)
        await body(request, decision=True)
        return queue.cancel(project_id, branch_id, job_id)

    @router.post("/{job_id}/retry")
    async def retry(project_id: str, branch_id: str, job_id: str, request: Request,
                    response: Response) -> dict[str, Any]:
        resource(request, response, project_id, branch_id, job_id)
        await body(request, decision=True)
        return queue.retry(project_id, branch_id, job_id)

    @router.get("/{job_id}/result")
    def result(project_id: str, branch_id: str, job_id: str, request: Request,
               response: Response) -> dict[str, Any]:
        resource(request, response, project_id, branch_id, job_id)
        return queue.result(project_id, branch_id, job_id)

    return router
