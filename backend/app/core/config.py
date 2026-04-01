from typing import Any
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CSE-326 Tweet API"
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:5173"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> Any:
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            if v.startswith("["):
                import json
                return json.loads(v)
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_service_role_key: str | None = None
    openrouter_api_key: str | None = None
    openrouter_model: str = "google/gemma-3-4b-it:free"
    openrouter_image_model: str = "black-forest-labs/flux.2-klein-4b"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 7

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def supabase_key(self) -> str | None:
        return self.supabase_service_role_key or self.supabase_anon_key


settings = Settings()
