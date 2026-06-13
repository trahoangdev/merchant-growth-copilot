from functools import lru_cache
import os
from pathlib import Path

from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "Merchant Growth Copilot API"
    environment: str = "local"
    client_origin: str = "http://localhost:3000"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/merchant_growth_copilot"
    redis_url: str = "redis://localhost:6379/0"
    data_dir: str = "server/data/imports"
    data_source: str = "csv"
    supabase_url: str | None = None
    supabase_publishable_key: str | None = None
    openai_api_key: str | None = None


@lru_cache
def get_settings() -> Settings:
    _load_env_file()
    return Settings(
        app_name=os.getenv("APP_NAME", Settings.model_fields["app_name"].default),
        environment=os.getenv("ENVIRONMENT", Settings.model_fields["environment"].default),
        client_origin=os.getenv("CLIENT_ORIGIN", Settings.model_fields["client_origin"].default),
        database_url=os.getenv("DATABASE_URL", Settings.model_fields["database_url"].default),
        redis_url=os.getenv("REDIS_URL", Settings.model_fields["redis_url"].default),
        data_dir=os.getenv("DATA_DIR", Settings.model_fields["data_dir"].default),
        data_source=os.getenv("DATA_SOURCE", Settings.model_fields["data_source"].default),
        supabase_url=os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or None,
        supabase_publishable_key=(
            os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") or None
        ),
        openai_api_key=os.getenv("OPENAI_API_KEY") or None,
    )


def _load_env_file() -> None:
    for path in (Path.cwd() / "server" / ".env", Path.cwd() / ".env"):
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line or line.lstrip().startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())
