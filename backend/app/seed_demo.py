"""Idempotent demo seeding for the production demo instance.

Run automatically on backend startup when SEED_DEMO is set (docker-compose.arief.yml).
Matches the real Keycloak demo accounts by username (teacher-demo / student-demo /
parent-demo); security.py links the real keycloak_sub on first login.
"""

import random
import string
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, func

from app.db import _SessionLocal
from app.models import (
    Assignment,
    Class_,
    Enrollment,
    LinkCode,
    ParentLink,
    Submission,
    User,
)

DEMO_USERS = [
    ("teacher-demo", "teacher-demo@learnloop.test", "teacher"),
    ("student-demo", "student-demo@learnloop.test", "student"),
    ("parent-demo", "parent-demo@learnloop.test", "parent"),
]


def _code(n: int) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=n))


def seed_demo() -> dict:
    """Seed demo classes/assignments/submissions for the demo accounts. Idempotent."""
    db = _SessionLocal()
    now = datetime.now(UTC).replace(tzinfo=None)
    try:
        if db.scalar(select(func.count()).select_from(Class_)) and db.scalar(
            select(func.count()).select_from(User).where(User.name == "teacher-demo")
        ):
            return {"skipped": "demo data already present"}

        users: dict[str, User] = {}
        for name, email, role in DEMO_USERS:
            u = db.query(User).filter(User.name == name).first()
            if u is None:
                u = User(keycloak_sub=f"pending-{name}", email=email, name=name, role=role)
                db.add(u)
            users[name] = u
        db.flush()

        teacher = users["teacher-demo"]
        student = users["student-demo"]
        parent = users["parent-demo"]

        c1 = db.query(Class_).filter(Class_.name == "Math Adventures 5A").first()
        if c1 is None:
            c1 = Class_(teacher_id=teacher.id, name="Math Adventures 5A", join_code=_code(6))
            db.add(c1)
        c2 = db.query(Class_).filter(Class_.name == "Science Explorers 5B").first()
        if c2 is None:
            c2 = Class_(teacher_id=teacher.id, name="Science Explorers 5B", join_code=_code(6))
            db.add(c2)
        db.flush()

        db.add(Enrollment(class_id=c1.id, student_id=student.id))
        db.flush()

        def assignment(cls, title, instructions, days):
            a = db.query(Assignment).filter(Assignment.title == title).first()
            if a is None:
                a = Assignment(class_id=cls.id, title=title, instructions=instructions,
                               due_at=now + timedelta(days=days))
                db.add(a)
            return a

        a1 = assignment(c1, "Fraction Pizza Party", "Draw a pizza with 8 slices; color 3/8 mushrooms and 4/8 cheese.", 1)
        a2 = assignment(c1, "Decimal Maze Challenge", "Navigate the stepping stones from 0.1 to 1.0!", 3)
        a3 = assignment(c2, "Rainforest Report", "One page about your favorite rainforest animal.", 7)
        a4 = assignment(c1, "Shape Scavenger Hunt", "Find 5 right triangles around your home.", -3)
        db.flush()

        def submission(a, text, days_ago, late):
            s = db.query(Submission).filter(Submission.assignment_id == a.id,
                                            Submission.student_id == student.id).first()
            if s is None:
                s = Submission(assignment_id=a.id, student_id=student.id, text=text,
                               submitted_at=now - timedelta(days=days_ago),
                               first_submitted_at=now - timedelta(days=days_ago),
                               is_late=late, version=1)
                db.add(s)

        submission(a4, "Found triangles in the roof window, pizza slice, and 3 books!", 4, False)

        lc = db.query(LinkCode).filter(LinkCode.student_id == student.id).first()
        if lc is None:
            db.add(LinkCode(student_id=student.id, code=_code(8)))
        pl = db.query(ParentLink).filter(ParentLink.parent_id == parent.id,
                                         ParentLink.student_id == student.id).first()
        if pl is None:
            db.add(ParentLink(parent_id=parent.id, student_id=student.id))

        db.commit()
        return {"seeded": True, "classes": 2, "assignments": 4}
    finally:
        db.close()
