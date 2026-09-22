"""JWT validation via Keycloak JWKS + user provisioning (architecture.md §4.2)."""

import json
import time
from typing import Any

import httpx
import jwt
import jwt.algorithms
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db import get_db
from app.models import User

_JWKS_CACHE: dict[str, Any] = {"keys": None, "fetched_at": 0.0}
_CACHE_TTL = 3600  # seconds; keys are rotated rarely, re-fetch on unknown kid anyway


def _fetch_jwks() -> dict[str, Any]:
    now = time.time()
    if _JWKS_CACHE["keys"] is None or now - _JWKS_CACHE["fetched_at"] > _CACHE_TTL:
        issuer = get_settings().keycloak_issuer
        resp = httpx.get(f"{issuer}/protocol/openid-connect/certs", timeout=10)
        resp.raise_for_status()
        _JWKS_CACHE["keys"] = resp.json()
        _JWKS_CACHE["fetched_at"] = now
    return _JWKS_CACHE["keys"]


def decode_token(token: str) -> dict[str, Any]:
    """Validate signature (JWKS, auto-refresh on unknown kid), iss, exp. Returns claims."""
    settings = get_settings()
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail="invalid token") from e

    jwks = _fetch_jwks()
    key = None
    for k in jwks.get("keys", []):
        if k.get("kid") == header.get("kid"):
            key = k
            break
    if key is None:
        # possible key rotation — force refresh once
        _JWKS_CACHE["keys"] = None
        jwks = _fetch_jwks()
        for k in jwks.get("keys", []):
            if k.get("kid") == header.get("kid"):
                key = k
                break
    if key is None:
        raise HTTPException(status_code=401, detail="unknown signing key")

    try:
        claims: dict[str, Any] = jwt.decode(
            token,
            jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key)),
            algorithms=["RS256"],
            audience=settings.keycloak_audience,
            issuer=settings.keycloak_issuer,
            options={"require": ["exp", "iss", "sub"]},
        )
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail="invalid token") from e
    return claims


def _role_from_claims(claims: dict[str, Any]) -> str:
    """Role from custom `role` attribute (realm mapper), falling back to realm roles."""
    role = claims.get("role")
    if isinstance(role, list):
        role = role[0] if role else None
    if role in ("student", "teacher", "parent"):
        return role
    realm_access = claims.get("realm_access", {}).get("roles", [])
    for r in ("student", "teacher", "parent"):
        if r in realm_access:
            return r
    return "student"


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """Validate Bearer token, upsert local profile row on first call."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    claims = decode_token(auth.removeprefix("Bearer ").strip())

    sub = claims["sub"]
    user = db.query(User).filter(User.keycloak_sub == sub).first()
    if user is None:
        username = claims.get("preferred_username", "")
        # Demo seeding creates profiles keyed by username before first login;
        # link the real keycloak_sub the first time that account signs in.
        user = db.query(User).filter(User.name == username).first() if username else None
        if user is not None:
            user.keycloak_sub = sub  # re-link: Keycloak subs can change on realm re-import
            db.commit()
            db.refresh(user)
            return user
        user = User(
            keycloak_sub=sub,
            email=claims.get("email", f"{sub}@unknown.local"),
            name=username or sub,
            role=_role_from_claims(claims),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def require_role(*roles: str):
    """Dependency factory: 403 unless the local profile's role is one of `roles`."""

    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="forbidden")
        return user

    return checker
