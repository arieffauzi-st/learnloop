"""Teacher endpoint tests: ownership enforcement + T2/T3 flows (issue #6 AC)."""

import time
from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.core import security
from app.core.config import get_settings
from app.db import Base, get_engine
from app.models import Class_, Enrollment, User
from tests.test_auth import JWKS, PRIV_PEM


@pytest.fixture(autouse=True)
def _db_and_jwks(monkeypatch, client):
    monkeypatch.setattr(security, "_fetch_jwks", lambda: JWKS)
    Base.metadata.drop_all(get_engine())
    Base.metadata.create_all(get_engine())
    # seed the teacher (provisioned by /me on first authed call) + others via DB
    yield


def _token(sub="teacher-1", role="teacher"):
    now = int(time.time())
    payload = {"sub": sub, "email": f"{sub}@x.test", "preferred_username": sub, "role": role,
               "iss": get_settings().keycloak_issuer, "aud": get_settings().keycloak_audience,
               "iat": now, "exp": now + 300}
    return jwt.encode(payload, PRIV_PEM, algorithm="RS256", headers={"kid": "test-key"})


def _auth(sub="teacher-1", role="teacher"):
    return {"Authorization": f"Bearer {_token(sub, role)}"}


def _seed_user(db, sub, role):
    u = User(keycloak_sub=sub, email=f"{sub}@x.test", name=sub, role=role)
    db.add(u)
    db.commit()
    return u


def _seed_class(client, auth, name="Matematika") -> dict:
    r = client.post("/api/v1/classes", json={"name": name}, headers=auth)
    assert r.status_code == 201, r.text
    return r.json()


def test_create_class_returns_join_code(client):
    r = client.post("/api/v1/classes", json={"name": "IPA"}, headers=_auth())
    assert r.status_code == 201
    body = r.json()
    assert len(body["join_code"]) == 6
    assert body["name"] == "IPA"


def test_join_code_unique_across_classes(client):
    a = _seed_class(client, _auth(), "A")
    b = _seed_class(client, _auth(), "B")
    assert a["join_code"] != b["join_code"]


def test_list_my_classes_only_mine(client):
    mine = _seed_class(client, _auth(), "Mine")
    r = client.get("/api/v1/classes", headers=_auth())
    names = [c["name"] for c in r.json()]
    assert names == ["Mine"]
    assert mine["name"] in names


def test_create_assignment_future_due_ok(client):
    cls = _seed_class(client, _auth())
    due = (datetime.now(UTC) + timedelta(days=3)).isoformat()
    r = client.post(f"/api/v1/classes/{cls['id']}/assignments",
                    json={"title": "Tugas 1", "instructions": "baca", "due_at": due},
                    headers=_auth())
    assert r.status_code == 201
    assert r.json()["title"] == "Tugas 1"


def test_create_assignment_past_due_422(client):
    """T2: 422 if due_at in past."""
    cls = _seed_class(client, _auth())
    due = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    r = client.post(f"/api/v1/classes/{cls['id']}/assignments",
                    json={"title": "Tugas 2", "instructions": "", "due_at": due},
                    headers=_auth())
    assert r.status_code == 422


def test_non_owner_gets_404_on_other_teacher_class(client):
    """Ownership: another teacher must NOT see or mutate class (404, no leak)."""
    cls = _seed_class(client, _auth(sub="teacher-1"), "Kelas guru 1")
    other = _auth(sub="teacher-2")
    assert client.get(f"/api/v1/classes/{cls['id']}/assignments", headers=other).status_code == 404
    due = (datetime.now(UTC) + timedelta(days=1)).isoformat()
    r = client.post(f"/api/v1/classes/{cls['id']}/assignments",
                    json={"title": "hack", "instructions": "", "due_at": due}, headers=other)
    assert r.status_code == 404


def test_students_cannot_use_teacher_endpoints(client):
    """403 for wrong role."""
    assert client.post("/api/v1/classes", json={"name": "X"}, headers=_auth(role="student")).status_code == 403
    assert client.get("/api/v1/classes", headers=_auth(role="parent")).status_code == 403
    assert client.get("/api/v1/assignments/1/submissions", headers=_auth(role="student")).status_code == 403


def test_roster_submitted_late_missing(client):
    """T3: one query → submitted / late / missing per student."""
    from app.db import _SessionLocal
    from app.models import Assignment, Submission
    db = _SessionLocal()

    teacher = _seed_user(db, "teacher-1", "teacher")
    cls = Class_(teacher_id=teacher.id, name="C", join_code="ABC234")
    db.add(cls)
    db.flush()
    s1 = _seed_user(db, "s1", "student")
    s2 = _seed_user(db, "s2", "student")
    s3 = _seed_user(db, "s3", "student")
    for s in (s1, s2, s3):
        db.add(Enrollment(class_id=cls.id, student_id=s.id))
    db.flush()
    due = datetime.now(UTC) + timedelta(days=2)
    db.add(Assignment(class_id=cls.id, title="T", instructions="", due_at=due))
    db.commit()

    a = db.query(Assignment).first()
    now = datetime.now(UTC)
    # s1: on time; s2: late; s3: missing
    db.add(Submission(assignment_id=a.id, student_id=s1.id, text="ok",
                      submitted_at=now - timedelta(days=1), first_submitted_at=now - timedelta(days=1),
                      is_late=False, version=1))
    db.add(Submission(assignment_id=a.id, student_id=s2.id, text="late",
                      submitted_at=now + timedelta(days=3), first_submitted_at=now + timedelta(days=3),
                      is_late=True, version=1))
    db.commit()
    db.close()

    r = client.get(f"/api/v1/assignments/{a.id}/submissions", headers=_auth())
    assert r.status_code == 200
    rows = {row["student_name"]: row["status"] for row in r.json()}
    assert rows == {"s1": "submitted", "s2": "late", "s3": "missing"}


def test_unauthenticated_401(client):
    assert client.post("/api/v1/classes", json={"name": "X"}).status_code == 401
