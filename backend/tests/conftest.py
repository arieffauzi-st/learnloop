import pytest
from fastapi.testclient import TestClient

import app.models  # registers all mappers on Base.metadata
from app.db import Base, get_engine
from app.main import app


@pytest.fixture(autouse=True)
def _db_tables():
    """Ensure the schema exists for every test regardless of file order."""
    Base.metadata.create_all(get_engine())
    yield


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)
