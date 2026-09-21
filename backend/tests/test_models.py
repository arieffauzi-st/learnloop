"""Model constraint tests — issue #4 AC: pytest coverage of model constraints."""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.exc import IntegrityError

from app.db import Base, get_engine
from app.models import (
    Assignment,
    Class_,
    Enrollment,
    LinkCode,
    ParentLink,
    Submission,
    User,
)


@pytest.fixture()
def session():
    Base.metadata.drop_all(get_engine())
    Base.metadata.create_all(get_engine())
    from app.db import _SessionLocal
    db = _SessionLocal()
    yield db
    db.close()


def _teacher(db, i=1) -> User:
    u = User(keycloak_sub=f"t{i}", email=f"t{i}@x.test", name=f"T{i}", role="teacher")
    db.add(u)
    db.flush()
    return u


def _student(db, i=1) -> User:
    u = User(keycloak_sub=f"s{i}", email=f"s{i}@x.test", name=f"S{i}", role="student")
    db.add(u)
    db.flush()
    return u


def test_user_role_check_constraint(session):
    session.add(User(keycloak_sub="x", email="x@x.test", name="X", role="admin"))
    with pytest.raises(IntegrityError):
        session.commit()


def test_duplicate_keycloak_sub_rejected(session):
    session.add(User(keycloak_sub="dup", email="a@x.test", name="A", role="student"))
    session.commit()
    session.add(User(keycloak_sub="dup", email="b@x.test", name="B", role="teacher"))
    with pytest.raises(IntegrityError):
        session.commit()


def test_unique_join_code(session):
    t = _teacher(session)
    session.add(Class_(teacher_id=t.id, name="A", join_code="ABC123"))
    session.commit()
    session.add(Class_(teacher_id=t.id, name="B", join_code="ABC123"))
    with pytest.raises(IntegrityError):
        session.commit()


def test_unique_enrollment(session):
    t = _teacher(session)
    s = _student(session)
    c = Class_(teacher_id=t.id, name="C", join_code="JOIN01")
    session.add(c)
    session.flush()
    session.add(Enrollment(class_id=c.id, student_id=s.id))
    session.commit()
    session.add(Enrollment(class_id=c.id, student_id=s.id))
    with pytest.raises(IntegrityError):
        session.commit()


def test_submission_unique_per_assignment_student(session):
    t = _teacher(session)
    s = _student(session)
    c = Class_(teacher_id=t.id, name="C", join_code="JOIN02")
    session.add(c)
    session.flush()
    a = Assignment(class_id=c.id, title="T", instructions="", due_at=datetime.now(UTC))
    session.add(a)
    session.flush()
    now = datetime.now(UTC)
    session.add(Submission(assignment_id=a.id, student_id=s.id, text="v1",
                           submitted_at=now, first_submitted_at=now, is_late=False, version=1))
    session.commit()
    session.add(Submission(assignment_id=a.id, student_id=s.id, text="v2",
                           submitted_at=now, first_submitted_at=now, is_late=False, version=2))
    with pytest.raises(IntegrityError):
        session.commit()


def test_is_late_server_computed(session):
    """is_late must be derived from submitted_at vs due_at at write time."""
    t = _teacher(session)
    s = _student(session)
    due = datetime.now(UTC) - timedelta(hours=1)  # past due
    c = Class_(teacher_id=t.id, name="C", join_code="JOIN03")
    session.add(c)
    session.flush()
    a = Assignment(class_id=c.id, title="T", instructions="", due_at=due)
    session.add(a)
    session.flush()
    now = datetime.now(UTC)
    sub = Submission(assignment_id=a.id, student_id=s.id, text="late",
                     submitted_at=now, first_submitted_at=now, is_late=now > due, version=1)
    session.add(sub)
    session.commit()
    assert sub.is_late is True


def test_cascade_delete_class_removes_assignments(session):
    t = _teacher(session)
    c = Class_(teacher_id=t.id, name="C", join_code="JOIN04")
    session.add(c)
    session.flush()
    session.add(Assignment(class_id=c.id, title="T", instructions="",
                           due_at=datetime.now(UTC)))
    session.commit()
    session.delete(c)
    session.commit()
    assert session.query(Assignment).count() == 0


def test_parent_link_unique(session):
    p = User(keycloak_sub="p1", email="p@x.test", name="P", role="parent")
    s = _student(session)
    session.add(p)
    session.flush()
    session.add(ParentLink(parent_id=p.id, student_id=s.id))
    session.commit()
    session.add(ParentLink(parent_id=p.id, student_id=s.id))
    with pytest.raises(IntegrityError):
        session.commit()


def test_link_code_unique(session):
    s1 = _student(session, 1)
    s2 = _student(session, 2)
    session.add(LinkCode(student_id=s1.id, code="CODE1234"))
    session.commit()
    session.add(LinkCode(student_id=s2.id, code="CODE1234"))
    with pytest.raises(IntegrityError):
        session.commit()
