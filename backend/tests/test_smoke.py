"""Smoke test: app boots and health endpoints respond."""


def test_root_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_api_v1_health(client):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_openapi_available(client):
    resp = client.get("/openapi.json")
    assert resp.status_code == 200
