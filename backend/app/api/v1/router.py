"""API v1 router. Feature routers (auth, classes, assignments, ...) mount here."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
