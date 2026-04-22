"""FastAPI application entrypoint."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from sentiment_app.api.routes import router as api_router
from sentiment_app.database.sqlite import init_db
from sentiment_app.exceptions import AppError
from sentiment_app.services import workspace as ws
from sentiment_app.settings import get_settings
from sentiment_app.utils.logging_config import configure_app_logging, get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_app_logging(settings.log_level(), settings.structured_logging())
    ws.workspace_dir().mkdir(parents=True, exist_ok=True)
    ws.uploads_dir()
    init_db(ws.db_path())
    logger.info("application.startup_complete")
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Sentiment Analysis API",
        version="2.0.0",
        lifespan=lifespan,
    )

    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": {"code": exc.code, "message": exc.message}},
        )

    cfg = ws.load_app_config()
    origins = cfg.get("api", {}).get(
        "cors_origins",
        ["http://localhost:5173", "http://127.0.0.1:5173"],
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    def root() -> dict[str, str]:
        """SPA runs on Vite; this API has no HTML at `/`."""
        return {
            "service": "sentiment-analysis-api",
            "hint": "Open /docs for Swagger UI or run the frontend (npm run dev).",
            "healthcheck": "/healthcheck",
            "docs": "/docs",
            "openapi": "/openapi.json",
            "api_prefix": "/api",
        }

    @app.get("/healthcheck")
    def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(api_router)
    return app


app = create_app()


def main() -> None:
    import uvicorn

    host = os.environ.get("API_HOST", "0.0.0.0")
    port = int(os.environ.get("API_PORT", "8000"))
    uvicorn.run("sentiment_app.api.main:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
