"""Enrollment tests: validation, persistence, rate limit, public access (issue #9 AC)."""

import time

import jwt
import pytest

from app.core import security
from app.core.config import get_settings
from app.db import Base, get_engine
from tests.test_auth import JWKS, PRIV_PEM


@pytest.fixture(autouse=True)
def _db_and_jwks(monkeypatch, client):
    monkeypatch.setattr(security, "_fetch_jwks", lambda: JWKS)
    Base.metadata.drop_all(get_engine())
    Base.metadata.create_all(get_engine())
    import app.routers.enrollment as enr
    enr._RATE.clear()
    yield


def _teacher_auth():
    now = int(time.time())
    payload = {"sub": "teacher-1", "email": "teacher-1@x.test", "preferred_username": "teacher-1",
               "role": "teacher", "iss": get_settings().keycloak_issuer,
               "aud": get_settings().keycloak_audience, "iat": now, "exp": now + 300}
    return {"Authorization": "Bearer " + jwt.encode(payload, PRIV_PEM, algorithm="RS256",
                                                    headers={"kid": "test-key"})}


@pytest.fixture(autouse=True)
def _db(client):
    Base.metadata.drop_all(get_engine())
    Base.metadata.create_all(get_engine())
    # reset rate limiter between tests
    import app.routers.enrollment as enr
    enr._RATE.clear()
    yield


def test_persist_trial_request(client):
    r = client.post("/api/v1/enrollment/trial", json={
        "parent_name": "Budi", "email": "budi@example.com", "child_age": 8})
    assert r.status_code == 201
    body = r.json()
    assert body["parent_name"] == "Budi"
    assert body["status"] == "new"
    # persisted — read back (teacher-only since issue #60)
    r_anon = client.get(f"/api/v1/enrollment/trial/{body['id']}")
    assert r_anon.status_code == 401
    r2 = client.get(f"/api/v1/enrollment/trial/{body['id']}", headers=_teacher_auth())
    assert r2.status_code == 200
    assert r2.json()["email"] == "budi@example.com"


def test_validation_rejects_bad_payload(client):
    # bad email
    assert client.post("/api/v1/enrollment/trial", json={
        "parent_name": "Bu", "email": "not-an-email", "child_age": 8}).status_code == 422
    # age out of range
    assert client.post("/api/v1/enrollment/trial", json={
        "parent_name": "Bu", "email": "a@example.com", "child_age": 2}).status_code == 422
    assert client.post("/api/v1/enrollment/trial", json={
        "parent_name": "Bu", "email": "a@example.com", "child_age": 30}).status_code == 422
    # name too short
    assert client.post("/api/v1/enrollment/trial", json={
        "parent_name": "B", "email": "a@example.com", "child_age": 8}).status_code == 422


def test_rate_limit_429(client):
    for _ in range(5):
        r = client.post("/api/v1/enrollment/trial", json={
            "parent_name": "Bu", "email": "a@example.com", "child_age": 8})
        assert r.status_code == 201
    r = client.post("/api/v1/enrollment/trial", json={
        "parent_name": "Bu", "email": "a@example.com", "child_age": 8})
    assert r.status_code == 429


def test_unknown_trial_404(client):
    r = client.get("/api/v1/enrollment/trial/999", headers=_teacher_auth())
    assert r.status_code == 404
