from functools import lru_cache
import os

from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "Merchant Growth Copilot API"
    environment: str = "local"
    client_origin: str = "http://localhost:3000"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/merchant_growth_copilot"
    redis_url: str = "redis://localhost:6379/0"
    use_mock_data: bool = True
    openai_api_key: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings(
        app_name=os.getenv("APP_NAME", Settings.model_fields["app_name"].default),
        environment=os.getenv("ENVIRONMENT", Settings.model_fields["environment"].default),
        client_origin=os.getenv("CLIENT_ORIGIN", Settings.model_fields["client_origin"].default),
        database_url=os.getenv("DATABASE_URL", Settings.model_fields["database_url"].default),
        redis_url=os.getenv("REDIS_URL", Settings.model_fields["redis_url"].default),
        use_mock_data=os.getenv("USE_MOCK_DATA", "true").lower() in {"1", "true", "yes"},
        openai_api_key=os.getenv("OPENAI_API_KEY") or None,
    )
