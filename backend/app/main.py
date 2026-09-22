"""LearnLoop FastAPI application entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as api_v1_router
from app.core.config import get_settings
from app.db import get_engine
from app.models import Base

settings = get_settings()

app = FastAPI(title=settings.app_name, version="0.1.0")


@app.on_event("startup")
def create_tables() -> None:
    # Idempotent: creates missing tables on first boot (prod SQLite has no
    # schema until the seed script runs, which caused 500s on every authed
    # call: "no such table: users").
    Base.metadata.create_all(get_engine())

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api_v1_router, prefix="/api/v1")
