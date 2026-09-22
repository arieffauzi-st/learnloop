"""Student workflows: join class, submit (latest-wins), link codes, XP (issue #7).

Integrity (architecture.md §5.1): submitted_at/is_late server-computed;
resubmit = UPDATE bumping version; optimistic concurrency via version check.
"""

import secrets
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.security import require_role
from app.db import get_db
from app.models import (
    Assignment,
    Class_,
    Enrollment,
    LinkCode,
    Submission,
    User,
)

router = APIRouter(tags=["student"])
student_required = require_role("student")


class JoinRequest(BaseModel):
    join_code: str = Field(min_length=6, max_length=6)


class SubmitRequest(BaseModel):
    text: str = ""
    link_url: str | None = None
    expected_version: int | None = None  # optimistic concurrency


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


@router.post("/classes/join", status_code=201)
def join_class(payload: JoinRequest, student: User = Depends(student_required),
               db: Session = Depends(get_db)):
    """S1: 404 unknown code, 409 already joined."""
    cls = db.query(Class_).filter(Class_.join_code == payload.join_code).first()
    if cls is None:
        raise HTTPException(status_code=404, detail="not found")
    if db.query(Enrollment).filter(
        Enrollment.class_id == cls.id, Enrollment.student_id == student.id
    ).first():
        raise HTTPException(status_code=409, detail="already joined")
    db.add(Enrollment(class_id=cls.id, student_id=student.id))
    db.commit()
    return {"class_id": cls.id, "class_name": cls.name}


@router.post("/assignments/{assignment_id}/submit", status_code=201)
def submit(assignment_id: int, payload: SubmitRequest,
           student: User = Depends(student_required), db: Session = Depends(get_db)):
    """S3: enrolled students only; server stamps time; is_late computed.

    Latest-wins: if a submission already exists (e.g. the client always POSTs),
    update it instead of raising a UNIQUE-constraint 500 (QA round 2 bug)."""
    a = _enrolled_assignment(db, assignment_id, student.id)
    sub = db.query(Submission).filter(
        Submission.assignment_id == assignment_id, Submission.student_id == student.id
    ).first()
    if sub is not None:
        if payload.expected_version is not None and payload.expected_version != sub.version:
            raise HTTPException(status_code=409, detail="version conflict")
        return _write_submission(db, a, student.id, payload, existing=sub)
    return _write_submission(db, a, student.id, payload)


@router.put("/assignments/{assignment_id}/submit", status_code=200)
def resubmit(assignment_id: int, payload: SubmitRequest,
             student: User = Depends(student_required), db: Session = Depends(get_db)):
    """Latest-wins resubmit: UPDATE bumps version, recomputes stamps; 409 on version race."""
    a = _enrolled_assignment(db, assignment_id, student.id)
    sub = db.query(Submission).filter(
        Submission.assignment_id == assignment_id, Submission.student_id == student.id
    ).first()
    if sub is None:
        raise HTTPException(status_code=404, detail="not found")
    if payload.expected_version is not None and payload.expected_version != sub.version:
        raise HTTPException(status_code=409, detail="version conflict")
    return _write_submission(db, a, student.id, payload, existing=sub)


@router.get("/me/link-code")
def get_link_code(student: User = Depends(student_required), db: Session = Depends(get_db)):
    lc = db.query(LinkCode).filter(LinkCode.student_id == student.id).first()
    if lc is None:
        lc = LinkCode(student_id=student.id, code=_gen_link_code(db))
        db.add(lc)
        db.commit()
        db.refresh(lc)
    return {"code": lc.code, "rotated_at": lc.rotated_at}


@router.post("/me/link-code")
def rotate_link_code(student: User = Depends(student_required), db: Session = Depends(get_db)):
    lc = db.query(LinkCode).filter(LinkCode.student_id == student.id).first()
    if lc is None:
        lc = LinkCode(student_id=student.id, code=_gen_link_code(db))
        db.add(lc)
    else:
        lc.code = _gen_link_code(db)
        lc.rotated_at = _now()
    db.commit()
    db.refresh(lc)
    return {"code": lc.code, "rotated_at": lc.rotated_at}


@router.get("/me/progress")
def progress(student: User = Depends(student_required), db: Session = Depends(get_db)):
    """S4/P2: derived XP = 10×on_time + 5×late; streak = consecutive on-time by due date."""
    rows = (
        db.query(Submission, Assignment.due_at)
        .join(Assignment, Submission.assignment_id == Assignment.id)
        .filter(Submission.student_id == student.id)
        .all()
    )
    on_time = sum(1 for s, _ in rows if not s.is_late)
    late = sum(1 for s, _ in rows if s.is_late)
    streak = 0
    for s, due in sorted(rows, key=lambda r: r[1]):
        if not s.is_late:
            streak += 1
        else:
            streak = 0
    return {"xp": 10 * on_time + 5 * late, "on_time": on_time, "late": late, "streak": streak}


def _enrolled_assignment(db: Session, assignment_id: int, student_id: int) -> Assignment:
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if a is None:
        raise HTTPException(status_code=404, detail="not found")
    enrolled = db.query(Enrollment).filter(
        Enrollment.class_id == a.class_id, Enrollment.student_id == student_id
    ).first()
    if enrolled is None:
        raise HTTPException(status_code=403, detail="not enrolled")
    return a


def _write_submission(db: Session, a: Assignment, student_id: int,
                      payload: SubmitRequest, existing: Submission | None = None):
    now = _now()
    is_late = now > a.due_at
    if existing is None:
        sub = Submission(
            assignment_id=a.id, student_id=student_id,
            text=payload.text, link_url=payload.link_url,
            submitted_at=now, first_submitted_at=now, is_late=is_late, version=1,
        )
        db.add(sub)
    else:
        existing.text = payload.text
        existing.link_url = payload.link_url
        existing.submitted_at = now
        existing.is_late = is_late
        existing.version += 1
        sub = existing
    db.commit()
    db.refresh(sub)
    return {"id": sub.id, "version": sub.version, "is_late": sub.is_late,
            "submitted_at": sub.submitted_at}


def _gen_link_code(db: Session) -> str:
    while True:
        code = "".join(secrets.choice("ABCDEFGHJKMNPQRSTUVWXYZ23456789") for _ in range(8))
        if not db.query(LinkCode).filter(LinkCode.code == code).first():
            return code


class AssignmentOut(BaseModel):
    id: int
    class_id: int
    title: str
    instructions: str
    due_at: str


@router.get("/student/assignments", response_model=list[AssignmentOut])
def my_assignments(student: User = Depends(student_required), db: Session = Depends(get_db)):
    """All assignments from the classes this student is enrolled in."""
    rows = (
        db.query(Assignment)
        .join(Enrollment, Enrollment.class_id == Assignment.class_id)
        .filter(Enrollment.student_id == student.id)
        .all()
    )
    return [AssignmentOut(id=a.id, class_id=a.class_id, title=a.title,
                          instructions=a.instructions, due_at=a.due_at.isoformat()) for a in rows]
