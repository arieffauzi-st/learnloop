"""Public enrollment funnel: trial class requests (issue #9, E1).

Public endpoint (no auth). Simple IP-based in-memory rate limit; validation + persistence.
"""

import time

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.core.security import require_role
from app.db import get_db
from app.models import TrialRequest

router = APIRouter(tags=["enrollment"])

# simple in-memory rate limiter: 5 requests / minute / IP (enough for an MVP portfolio)
_RATE: dict[str, list[float]] = {}
_RATE_LIMIT = 5
_RATE_WINDOW = 60.0


class TrialRequestIn(BaseModel):
    parent_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    child_age: int = Field(ge=3, le=18)


class TrialRequestOut(BaseModel):
    id: int
    parent_name: str
    email: str
    child_age: int
    status: str


@router.post("/enrollment/trial", response_model=TrialRequestOut, status_code=201)
def book_trial(payload: TrialRequestIn, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    bucket = [t for t in _RATE.get(ip, []) if now - t < _RATE_WINDOW]
    if len(bucket) >= _RATE_LIMIT:
        raise HTTPException(status_code=429, detail="too many requests, try later")
    bucket.append(now)
    _RATE[ip] = bucket

    tr = TrialRequest(parent_name=payload.parent_name, email=payload.email,
                      child_age=payload.child_age)
    db.add(tr)
    db.commit()
    db.refresh(tr)
    return tr


@router.get("/enrollment/trial/{trial_id}", response_model=TrialRequestOut)
def get_trial(trial_id: int, db: Session = Depends(get_db),
              _teacher: object = Depends(require_role("teacher"))):
    """Read-back endpoint (teachers/admin only; was an unauthenticated PII leak, issue #60)."""
    tr = db.query(TrialRequest).filter(TrialRequest.id == trial_id).first()
    if tr is None:
        raise HTTPException(status_code=404, detail="not found")
    return tr
