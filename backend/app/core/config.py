from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App config from environment (12-factor). No secrets in repo."""

    app_name: str = "LearnLoop API"
    database_url: str = "sqlite:///./learnloop.db"
    keycloak_issuer: str = "http://localhost:8080/realms/learnloop"
    keycloak_audience: str = "learnloop-api"
    cors_origins: list[str] = ["http://localhost:5173"]
    # Optional pepper for join/link codes (see architecture.md §3)
    join_code_pepper: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
