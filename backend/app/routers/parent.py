"""Parent workflows: link via child's code + read-only child summary (issue #8, A3/P1+P2)."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.security import require_role
from app.db import get_db
from app.models import Assignment, Class_, Enrollment, LinkCode, ParentLink, Submission, User

router = APIRouter(prefix="/parent", tags=["parent"])
parent_required = require_role("parent")
MAX_CHILDREN = 3  # architecture.md §5: cap app-enforced


class LinkRequest(BaseModel):
    link_code: str = Field(min_length=8, max_length=8)


def _linked_child(db: Session, parent: User, child_id: int) -> User:
    """404 unless the child is linked to this parent (no existence leaks)."""
    link = db.query(ParentLink).filter(
        ParentLink.parent_id == parent.id, ParentLink.student_id == child_id
    ).first()
    if link is None:
        raise HTTPException(status_code=404, detail="not found")
    return db.query(User).filter(User.id == child_id).first()


@router.post("/link", status_code=201)
def link_child(payload: LinkRequest, parent: User = Depends(parent_required),
               db: Session = Depends(get_db)):
    """A3: parent enters child's 8-char link code → creates parent_links row."""
    if db.query(ParentLink).filter(ParentLink.parent_id == parent.id).count() >= MAX_CHILDREN:
        raise HTTPException(status_code=422, detail=f"max {MAX_CHILDREN} children per parent")
    lc = db.query(LinkCode).filter(LinkCode.code == payload.link_code).first()
    if lc is None:
        raise HTTPException(status_code=404, detail="not found")
    if lc.student_id == parent.id:
        raise HTTPException(status_code=422, detail="cannot link to self")
    if db.query(ParentLink).filter(
        ParentLink.parent_id == parent.id, ParentLink.student_id == lc.student_id
    ).first():
        raise HTTPException(status_code=409, detail="already linked")
    db.add(ParentLink(parent_id=parent.id, student_id=lc.student_id))
    db.commit()
    child = db.query(User).filter(User.id == lc.student_id).first()
    return {"child_id": child.id, "child_name": child.name}


@router.get("/children")
def my_children(parent: User = Depends(parent_required), db: Session = Depends(get_db)):
    rows = (
        db.query(User)
        .join(ParentLink, ParentLink.student_id == User.id)
        .filter(ParentLink.parent_id == parent.id)
        .all()
    )
    return [{"child_id": u.id, "child_name": u.name} for u in rows]


@router.get("/children/{child_id}/summary")
def child_summary(child_id: int, parent: User = Depends(parent_required),
                  db: Session = Depends(get_db)):
    """P1+P2 payload: level/streak/weekly chips + per-class XP bars + recent submissions."""
    child = _linked_child(db, parent, child_id)

    subs = (
        db.query(Submission, Assignment)
        .join(Assignment, Submission.assignment_id == Assignment.id)
        .filter(Submission.student_id == child.id)
        .all()
    )
    on_time = sum(1 for s, _ in subs if not s.is_late)
    late = sum(1 for s, _ in subs if s.is_late)
    xp = 10 * on_time + 5 * late
    level = xp // 50 + 1  # simple level curve: 50 XP per level

    streak = 0
    for s, a in sorted(subs, key=lambda r: r[1].due_at):
        streak = streak + 1 if not s.is_late else 0

    # per-class XP bars
    per_class: dict[int, dict] = {}
    for s, a in subs:
        cls = db.query(Class_).filter(Class_.id == a.class_id).first()
        entry = per_class.setdefault(cls.id, {"class_id": cls.id, "class_name": cls.name,
                                              "xp": 0, "total": 0})
        entry["xp"] += 5 if s.is_late else 10
        entry["total"] += 1

    # recent submissions w/ status chips
    recent = sorted(subs, key=lambda r: r[0].submitted_at, reverse=True)[:5]
    recent_out = [{"assignment_title": a.title, "status": "late" if s.is_late else "on_time",
                   "submitted_at": s.submitted_at, "version": s.version} for s, a in recent]

    # assignments with no submission → missing
    enrolled_class_ids = [e.class_id for e in
                          db.query(Enrollment).filter(Enrollment.student_id == child.id).all()]
    submitted_ids = {s.assignment_id for s, _ in subs}
    missing = (
        db.query(Assignment)
        .filter(Assignment.class_id.in_(enrolled_class_ids),
                Assignment.due_at < datetime_utcnow())
        .all()
    )
    missing_out = [{"assignment_title": a.title, "status": "missing"}
                   for a in missing if a.id not in submitted_ids]

    return {
        "child": {"id": child.id, "name": child.name},
        "level": level,
        "xp": xp,
        "streak": streak,
        "on_time": on_time,
        "late": late,
        "per_class": list(per_class.values()),
        "recent_submissions": recent_out,
        "missing": missing_out,
    }


def datetime_utcnow():
    from datetime import UTC, datetime
    return datetime.now(UTC).replace(tzinfo=None)
