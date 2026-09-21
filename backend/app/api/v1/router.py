"""API v1 router. Feature routers mount here."""

from fastapi import APIRouter

from app.routers.auth import router as auth_router
from app.routers.enrollment import router as enrollment_router
from app.routers.parent import router as parent_router
from app.routers.student import router as student_router
from app.routers.teacher import router as teacher_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(teacher_router)
router.include_router(student_router)
router.include_router(parent_router)
router.include_router(enrollment_router)


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
