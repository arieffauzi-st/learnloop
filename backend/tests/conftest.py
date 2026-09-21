import pytest
from fastapi.testclient import TestClient

from app.db import Base, get_engine
import app.models  # noqa: F401  (registers all mappers on Base.metadata)
from app.main import app


@pytest.fixture(autouse=True)
def _db_tables():
    """Ensure the schema exists for every test regardless of file order."""
    Base.metadata.create_all(get_engine())
    yield


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)
