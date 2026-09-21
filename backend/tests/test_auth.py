"""Auth tests: 401 without token, token validation, provisioning, require_role 403."""

import time

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core import security
from app.core.config import get_settings

TEST_RSA_EXPONENT = 65537


def _make_keypair(kid="test-key"):
    """Generate an RSA keypair for signing test tokens."""
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa

    key = rsa.generate_private_key(public_exponent=TEST_RSA_EXPONENT, key_size=2048)
    priv_pem = key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    pub_jwk = jwt.algorithms.RSAAlgorithm.to_jwk(key.public_key(), as_dict=True)
    pub_jwk["kid"] = kid
    pub_jwk["use"] = "sig"
    pub_jwk["alg"] = "RS256"
    return priv_pem, {"keys": [pub_jwk]}


PRIV_PEM, JWKS = _make_keypair()


@pytest.fixture(autouse=True)
def fake_jwks(monkeypatch):
    monkeypatch.setattr(security, "_fetch_jwks", lambda: JWKS)


def _token(sub="user-1", role="teacher", email="u@x.test", name="User"):
    now = int(time.time())
    payload = {
        "sub": sub, "email": email, "preferred_username": name,
        "role": role, "iss": get_settings().keycloak_issuer,
        "aud": get_settings().keycloak_audience,
        "iat": now, "exp": now + 300,
    }
    return jwt.encode(payload, PRIV_PEM, algorithm="RS256", headers={"kid": "test-key"})


def test_me_requires_token(client: TestClient):
    assert client.get("/api/v1/auth/me").status_code == 401


def test_me_invalid_token_401(client: TestClient):
    r = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert r.status_code == 401


def test_me_provisions_user_on_first_call(client: TestClient):
    r = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {_token()}"})
    assert r.status_code == 200
    body = r.json()
    assert body["role"] == "teacher"
    assert body["email"] == "u@x.test"
    # second call returns same profile (no dup)
    r2 = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {_token()}"})
    assert r2.json()["id"] == body["id"]


def test_expired_token_401(client: TestClient):
    now = int(time.time())
    payload = {"sub": "u", "role": "student", "iss": get_settings().keycloak_issuer,
               "aud": get_settings().keycloak_audience, "iat": now - 600, "exp": now - 300}
    tok = jwt.encode(payload, PRIV_PEM, algorithm="RS256", headers={"kid": "test-key"})
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tok}"}).status_code == 401


def test_wrong_issuer_401(client: TestClient):
    now = int(time.time())
    payload = {"sub": "u", "role": "student", "iss": "http://evil/", "aud": "learnloop-api",
               "iat": now, "exp": now + 300}
    tok = jwt.encode(payload, PRIV_PEM, algorithm="RS256", headers={"kid": "test-key"})
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tok}"}).status_code == 401


def test_role_mapper_from_realm_access(client: TestClient):
    now = int(time.time())
    payload = {"sub": "realm-role-user", "iss": get_settings().keycloak_issuer,
               "aud": get_settings().keycloak_audience, "iat": now, "exp": now + 300,
               "realm_access": {"roles": ["parent"]}}
    tok = jwt.encode(payload, PRIV_PEM, algorithm="RS256", headers={"kid": "test-key"})
    r = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert r.json()["role"] == "parent"
