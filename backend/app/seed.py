"""Seed script: demo data for LearnLoop (architecture.md / issue #4).

Run:  cd backend && uv run python -m app.seed
"""

import random
import string
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.db import get_engine
from app.models import (
    Assignment,
    Base,
    Class_,
    Enrollment,
    LinkCode,
    ParentLink,
    Submission,
    User,
)


def random_code(n: int) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=n))


def seed() -> None:
    engine = get_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    from app.db import _SessionLocal  # ensured by get_engine()

    db = _SessionLocal()
    now = datetime.now(UTC).replace(tzinfo=None)

    try:
        # --- users: 2 teachers, 3 students, 1 parent
        t1 = User(keycloak_sub="seed-teacher-1", email="bu-rina@learnloop.test", name="Bu Rina", role="teacher")
        t2 = User(keycloak_sub="seed-teacher-2", email="pak-budi@learnloop.test", name="Pak Budi", role="teacher")
        s1 = User(keycloak_sub="seed-student-1", email="adi@learnloop.test", name="Adi", role="student")
        s2 = User(keycloak_sub="seed-student-2", email="bela@learnloop.test", name="Bela", role="student")
        s3 = User(keycloak_sub="seed-student-3", email="cika@learnloop.test", name="Cika", role="student")
        p1 = User(keycloak_sub="seed-parent-1", email="ortu-adi@learnloop.test", name="Ortu Adi", role="parent")
        db.add_all([t1, t2, s1, s2, s3, p1])
        db.flush()

        # --- 2 classes
        c1 = Class_(teacher_id=t1.id, name="Matematika 7A", join_code=random_code(6))
        c2 = Class_(teacher_id=t2.id, name="IPA 7B", join_code=random_code(6))
        db.add_all([c1, c2])
        db.flush()

        # --- enrollments: s1,s2 in c1; s2,s3 in c2
        db.add_all([
            Enrollment(class_id=c1.id, student_id=s1.id),
            Enrollment(class_id=c1.id, student_id=s2.id),
            Enrollment(class_id=c2.id, student_id=s2.id),
            Enrollment(class_id=c2.id, student_id=s3.id),
        ])

        # --- assignments: past + future due dates
        a1 = Assignment(class_id=c1.id, title="Latihan pecahan", instructions="Kerjakan hal 12-15.",
                        due_at=now - timedelta(days=2))  # already past
        a2 = Assignment(class_id=c1.id, title="Ujian geometri", instructions="Bab 4.",
                        due_at=now + timedelta(days=3))
        a3 = Assignment(class_id=c2.id, title="Laporan fotosintesis", instructions="Min 2 halaman.",
                        due_at=now + timedelta(days=7))
        db.add_all([a1, a2, a3])
        db.flush()

        # --- submissions: on-time, late, and missing (s2 missing a1)
        db.add_all([
            Submission(assignment_id=a1.id, student_id=s1.id, text="Selesai!",
                       submitted_at=now - timedelta(days=3), first_submitted_at=now - timedelta(days=3),
                       is_late=False, version=1),
            Submission(assignment_id=a1.id, student_id=s2.id, text="Telat dikit, maaf bu",
                       submitted_at=now - timedelta(days=1), first_submitted_at=now - timedelta(days=1),
                       is_late=True, version=2),
        ])
        # (a3 has no submissions yet; a2 due in future)

        # --- parent link + link code
        db.add(ParentLink(parent_id=p1.id, student_id=s1.id))
        db.add(LinkCode(student_id=s2.id, code=random_code(8)))

        db.commit()
        print("Seeded:", {
            "users": db.scalar(select(User.id).limit(1)) is not None,
            "classes": 2,
            "assignments": 3,
            "submissions": 2,
        })
    finally:
        db.close()


if __name__ == "__main__":
    seed()
