from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any, Literal

from fastapi import FastAPI, Response
from pydantic import BaseModel

from app.contracts import SCHEMA_VERSION, load_fixture


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Fail fast on an invalid checked-in fixture, before reporting healthy.
    load_fixture()
    yield


app = FastAPI(title="AETHER-DOM API", version="0.1.0", lifespan=lifespan)


class Health(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["aether-dom-api"] = "aether-dom-api"
    schemaVersion: str = SCHEMA_VERSION


@app.get("/api/v1/health", response_model=Health)
def health(response: Response) -> Health:
    response.headers["Cache-Control"] = "no-store"
    return Health()


@app.get("/api/v1/fixtures/neon-shogun")
def fixture(response: Response) -> dict[str, Any]:
    response.headers["Cache-Control"] = "no-store"
    return load_fixture()
