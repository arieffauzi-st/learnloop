"""Student workflow tests: join (404/409), submit integrity, resubmit, link code, XP."""

import time
from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.core import security
from app.core.config import get_settings
from app.db import Base, get_engine
from app.models import Assignment, Class_, Enrollment, User
from tests.test_auth import JWKS, PRIV_PEM


@pytest.fixture(autouse=True)
def _db_and_jwks(monkeypatch, client):
    monkeypatch.setattr(security, "_fetch_jwks", lambda: JWKS)
    Base.metadata.drop_all(get_engine())
    Base.metadata.create_all(get_engine())
    yield


def _token(sub="student-1", role="student"):
    now = int(time.time())
    payload = {"sub": sub, "email": f"{sub}@x.test", "preferred_username": sub, "role": role,
               "iss": get_settings().keycloak_issuer, "aud": get_settings().keycloak_audience,
               "iat": now, "exp": now + 300}
    return jwt.encode(payload, PRIV_PEM, algorithm="RS256", headers={"kid": "test-key"})


def _auth(sub="student-1", role="student"):
    return {"Authorization": f"Bearer {_token(sub, role)}"}


def _seed_class_with_assignment(due_offset_days=2, enrolled=("student-1",)) -> int:
    from app.db import _SessionLocal
    db = _SessionLocal()
    t = User(keycloak_sub="teacher-1", email="t@x.test", name="T", role="teacher")
    db.add(t)
    db.flush()
    cls = Class_(teacher_id=t.id, name="C", join_code="JOIN27")
    db.add(cls)
    db.flush()
    for sub in enrolled:
        u = User(keycloak_sub=sub, email=f"{sub}@x.test", name=sub, role="student")
        db.add(u)
        db.flush()
        db.add(Enrollment(class_id=cls.id, student_id=u.id))
    a = Assignment(class_id=cls.id, title="T", instructions="",
                   due_at=datetime.now(UTC) + timedelta(days=due_offset_days))
    db.add(a)
    db.commit()
    aid = a.id
    db.close()
    return aid


def test_join_unknown_code_404(client):
    r = client.post("/api/v1/classes/join", json={"join_code": "ZZZZ99"}, headers=_auth())
    assert r.status_code == 404


def test_join_ok_then_already_joined_409(client):
    _seed_class_with_assignment(enrolled=())
    r = client.post("/api/v1/classes/join", json={"join_code": "JOIN27"}, headers=_auth())
    assert r.status_code == 201
    r2 = client.post("/api/v1/classes/join", json={"join_code": "JOIN27"}, headers=_auth())
    assert r2.status_code == 409


def test_submit_not_enrolled_403(client):
    aid = _seed_class_with_assignment(enrolled=())
    r = client.post(f"/api/v1/assignments/{aid}/submit",
                    json={"text": "hi"}, headers=_auth())
    assert r.status_code == 403


def test_submit_on_time_not_late(client):
    aid = _seed_class_with_assignment(due_offset_days=2)
    r = client.post(f"/api/v1/assignments/{aid}/submit", json={"text": "kerja"},
                    headers=_auth())
    assert r.status_code == 201
    assert r.json()["is_late"] is False
    assert r.json()["version"] == 1


def test_submit_after_due_is_late(client):
    aid = _seed_class_with_assignment(due_offset_days=-2)  # due in past
    r = client.post(f"/api/v1/assignments/{aid}/submit", json={"text": "telat"},
                    headers=_auth())
    assert r.status_code == 201
    assert r.json()["is_late"] is True


def test_resubmit_latest_wins_bumps_version(client):
    aid = _seed_class_with_assignment()
    client.post(f"/api/v1/assignments/{aid}/submit", json={"text": "v1"}, headers=_auth())
    r = client.put(f"/api/v1/assignments/{aid}/submit", json={"text": "v2"}, headers=_auth())
    assert r.status_code == 200
    assert r.json()["version"] == 2


def test_resubmit_version_conflict_409(client):
    aid = _seed_class_with_assignment()
    client.post(f"/api/v1/assignments/{aid}/submit", json={"text": "v1"}, headers=_auth())
    r = client.put(f"/api/v1/assignments/{aid}/submit",
                   json={"text": "v2", "expected_version": 99}, headers=_auth())
    assert r.status_code == 409


def test_link_code_get_then_rotate(client):
    r1 = client.get("/api/v1/me/link-code", headers=_auth())
    assert r1.status_code == 200
    code1 = r1.json()["code"]
    assert len(code1) == 8
    r2 = client.post("/api/v1/me/link-code", headers=_auth())
    assert r2.status_code == 200
    assert r2.json()["code"] != code1


def test_progress_xp_and_streak(client):
    aid = _seed_class_with_assignment(due_offset_days=2)
    client.post(f"/api/v1/assignments/{aid}/submit", json={"text": "ok"}, headers=_auth())
    r = client.get("/api/v1/me/progress", headers=_auth())
    body = r.json()
    assert body["xp"] == 10
    assert body["streak"] == 1
    assert body["on_time"] == 1


def test_wrong_role_403(client):
    assert client.post("/api/v1/classes/join", json={"join_code": "JOIN27"},
                       headers=_auth(role="teacher")).status_code == 403
