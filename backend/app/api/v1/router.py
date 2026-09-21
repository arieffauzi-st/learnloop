"""API v1 router. Feature routers (auth, classes, assignments, ...) mount here."""

from fastapi import APIRouter

from app.routers.auth import router as auth_router

router = APIRouter()
router.include_router(auth_router)


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
