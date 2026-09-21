"""Auth routes: /api/v1/auth/me (architecture.md §6)."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.security import get_current_user
from app.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


class MeResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(id=user.id, email=user.email, name=user.name, role=user.role)
