"""Teacher workflows: classes + assignments + roster (issue #6).

Ownership enforced at query level (architecture.md §4.2): teacher only ever
sees/mutates rows where classes.teacher_id == current user.
"""

import secrets
from datetime import UTC

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import require_role
from app.db import get_db
from app.models import Assignment, Class_, Enrollment, Submission, User
from app.schemas.teacher import (
    AssignmentCreate,
    AssignmentOut,
    ClassCreate,
    ClassOut,
    StudentSubmissionRow,
)

router = APIRouter(tags=["teacher"])
teacher_required = require_role("teacher")


def _generate_join_code(db: Session) -> str:
    while True:
        code = "".join(secrets.choice("ABCDEFGHJKMNPQRSTUVWXYZ23456789") for _ in range(6))
        if not db.query(Class_).filter(Class_.join_code == code).first():
            return code


def _owned_class(db: Session, class_id: int, teacher: User) -> Class_:
    """404 unless the class exists AND belongs to this teacher (no existence leaks)."""
    cls = db.query(Class_).filter(Class_.id == class_id).first()
    if cls is None or cls.teacher_id != teacher.id:
        raise HTTPException(status_code=404, detail="not found")
    return cls


@router.post("/classes", response_model=ClassOut, status_code=201)
def create_class(
    payload: ClassCreate,
    teacher: User = Depends(teacher_required),
    db: Session = Depends(get_db),
):
    cls = Class_(teacher_id=teacher.id, name=payload.name, join_code=_generate_join_code(db))
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return cls


@router.get("/classes", response_model=list[ClassOut])
def my_classes(teacher: User = Depends(teacher_required), db: Session = Depends(get_db)):
    return db.query(Class_).filter(Class_.teacher_id == teacher.id).all()


@router.post("/classes/{class_id}/assignments", response_model=AssignmentOut, status_code=201)
def create_assignment(
    class_id: int,
    payload: AssignmentCreate,
    teacher: User = Depends(teacher_required),
    db: Session = Depends(get_db),
):
    _owned_class(db, class_id, teacher)  # 404 unless owner
    now = datetime_now()
    if payload.due_at <= now:
        raise HTTPException(status_code=422, detail="due_at must be in the future")
    a = Assignment(class_id=class_id, title=payload.title, instructions=payload.instructions,
                   due_at=payload.due_at)
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.get("/classes/{class_id}/assignments", response_model=list[AssignmentOut])
def list_assignments(
    class_id: int,
    teacher: User = Depends(teacher_required),
    db: Session = Depends(get_db),
):
    _owned_class(db, class_id, teacher)
    return db.query(Assignment).filter(Assignment.class_id == class_id).all()


@router.get("/assignments/{assignment_id}/submissions", response_model=list[StudentSubmissionRow])
def assignment_roster(
    assignment_id: int,
    teacher: User = Depends(teacher_required),
    db: Session = Depends(get_db),
):
    """T3: LEFT JOIN enrollments × submissions → submitted / late / missing per student."""
    a = (
        db.query(Assignment)
        .join(Class_, Assignment.class_id == Class_.id)
        .filter(Assignment.id == assignment_id, Class_.teacher_id == teacher.id)
        .first()
    )
    if a is None:
        raise HTTPException(status_code=404, detail="not found")

    rows = (
        db.query(User, Submission)
        .join(Enrollment, Enrollment.student_id == User.id)
        .outerjoin(
            Submission,
            (Submission.student_id == User.id) & (Submission.assignment_id == a.id),
        )
        .filter(Enrollment.class_id == a.class_id)
        .all()
    )
    out: list[StudentSubmissionRow] = []
    for user, sub in rows:
        if sub is None:
            out.append(StudentSubmissionRow(student_id=user.id, student_name=user.name, status="missing"))
        else:
            out.append(StudentSubmissionRow(
                student_id=user.id, student_name=user.name,
                status="late" if sub.is_late else "submitted",
                is_late=sub.is_late, submitted_at=sub.submitted_at, version=sub.version,
            ))
    return out


def datetime_now():
    from datetime import datetime
    return datetime.now(UTC)
