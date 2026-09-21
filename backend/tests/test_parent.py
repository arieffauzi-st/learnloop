"""Parent endpoint tests: linking + negative access tests (issue #8 AC)."""

import time
from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.core import security
from app.core.config import get_settings
from app.db import Base, get_engine
from app.models import Assignment, Class_, Enrollment, LinkCode, User
from tests.test_auth import JWKS, PRIV_PEM


@pytest.fixture(autouse=True)
def _db_and_jwks(monkeypatch, client):
    monkeypatch.setattr(security, "_fetch_jwks", lambda: JWKS)
    Base.metadata.drop_all(get_engine())
    Base.metadata.create_all(get_engine())
    yield


def _token(sub, role):
    now = int(time.time())
    payload = {"sub": sub, "email": f"{sub}@x.test", "preferred_username": sub, "role": role,
               "iss": get_settings().keycloak_issuer, "aud": get_settings().keycloak_audience,
               "iat": now, "exp": now + 300}
    return jwt.encode(payload, PRIV_PEM, algorithm="RS256", headers={"kid": "test-key"})


def _auth(sub, role):
    return {"Authorization": f"Bearer {_token(sub, role)}"}


def _seed(db) -> int:
    """Returns student id with a link code; also creates a second student (unlinked)."""
    s1 = User(keycloak_sub="student-1", email="s1@x.test", name="Anak A", role="student")
    s2 = User(keycloak_sub="student-2", email="s2@x.test", name="Anak B", role="student")
    t = User(keycloak_sub="teacher-1", email="t@x.test", name="T", role="teacher")
    db.add_all([s1, s2, t])
    db.flush()
    db.add(LinkCode(student_id=s1.id, code="LINKCODE"))
    cls = Class_(teacher_id=t.id, name="Kelas", join_code="JOIN27")
    db.add(cls)
    db.flush()
    db.add(Enrollment(class_id=cls.id, student_id=s1.id))
    db.add(Assignment(class_id=cls.id, title="Tugas 1", instructions="",
                      due_at=datetime.now(UTC).replace(tzinfo=None) + timedelta(days=2)))
    db.commit()
    return s1.id


def test_link_via_code_and_list_children(client):
    from app.db import _SessionLocal
    db = _SessionLocal()
    _seed(db)
    db.close()

    r = client.post("/api/v1/parent/link", json={"link_code": "LINKCODE"}, headers=_auth("parent-1", "parent"))
    assert r.status_code == 201, r.text
    assert r.json()["child_name"] == "Anak A"

    r = client.get("/api/v1/parent/children", headers=_auth("parent-1", "parent"))
    assert r.json() == [{"child_id": r.json()[0]["child_id"], "child_name": "Anak A"}]


def test_link_unknown_code_404(client):
    from app.db import _SessionLocal
    db = _SessionLocal()
    _seed(db)
    db.close()
    r = client.post("/api/v1/parent/link", json={"link_code": "XXXXXXXX"}, headers=_auth("parent-1", "parent"))
    assert r.status_code == 404


def test_link_duplicate_409(client):
    from app.db import _SessionLocal
    db = _SessionLocal()
    _seed(db)
    db.close()
    auth = _auth("parent-1", "parent")
    client.post("/api/v1/parent/link", json={"link_code": "LINKCODE"}, headers=auth)
    r = client.post("/api/v1/parent/link", json={"link_code": "LINKCODE"}, headers=auth)
    assert r.status_code == 409


def test_parent_cannot_see_unlinked_child(client):
    """AC negative test: unlinked child's summary → 404."""
    from app.db import _SessionLocal
    db = _SessionLocal()
    _seed(db)
    db.close()
    # student-2 exists but is not linked
    from app.models import User as U
    db = _SessionLocal()
    s2 = db.query(U).filter(U.keycloak_sub == "student-2").first()
    s2_id = s2.id
    db.close()

    client.post("/api/v1/parent/link", json={"link_code": "LINKCODE"}, headers=_auth("parent-1", "parent"))
    r = client.get(f"/api/v1/parent/children/{s2_id}/summary", headers=_auth("parent-1", "parent"))
    assert r.status_code == 404


def test_summary_requires_parent_role(client):
    assert client.get("/api/v1/parent/children", headers=_auth("x", "student")).status_code == 403
    assert client.post("/api/v1/parent/link", json={"link_code": "LINKCODE"},
                       headers=_auth("x", "teacher")).status_code == 403


def test_summary_payload(client):
    from app.db import _SessionLocal
    from app.models import Submission
    db = _SessionLocal()
    s1_id = _seed(db)
    a = db.query(Assignment).first()
    now = datetime.now(UTC).replace(tzinfo=None)
    db.add(Submission(assignment_id=a.id, student_id=s1_id, text="ok",
                      submitted_at=now, first_submitted_at=now, is_late=False, version=1))
    db.commit()
    db.close()

    client.post("/api/v1/parent/link", json={"link_code": "LINKCODE"}, headers=_auth("parent-1", "parent"))
    r = client.get(f"/api/v1/parent/children/{s1_id}/summary", headers=_auth("parent-1", "parent"))
    assert r.status_code == 200
    body = r.json()
    assert body["xp"] == 10
    assert body["level"] == 1
    assert body["streak"] == 1
    assert len(body["per_class"]) == 1
    assert body["per_class"][0]["xp"] == 10
    assert body["recent_submissions"][0]["status"] == "on_time"


def test_max_children_cap(client):
    from app.db import _SessionLocal
    from app.models import LinkCode as LC
    from app.models import User as U
    db = _SessionLocal()
    _seed(db)
    parent = U(keycloak_sub="parent-1", email="p@x.test", name="P", role="parent")
    db.add(parent)
    db.flush()
    for i in range(3):
        s = U(keycloak_sub=f"extra-{i}", email=f"e{i}@x.test", name=f"E{i}", role="student")
        db.add(s)
        db.flush()
        db.add(LC(student_id=s.id, code=f"CODE{i:04}"))
    db.commit()
    db.close()

    auth = _auth("parent-1", "parent")
    for i in range(3):
        r = client.post("/api/v1/parent/link", json={"link_code": f"CODE{i:04}"}, headers=auth)
        assert r.status_code == 201, r.text
    r = client.post("/api/v1/parent/link", json={"link_code": "LINKCODE"}, headers=auth)
    assert r.status_code == 422
