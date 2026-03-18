from functools import lru_cache

from supabase import Client, create_client

from app.core.config import settings


def _get_supabase_credentials() -> tuple[str, str]:
    if not settings.supabase_url:
        raise RuntimeError("SUPABASE_URL is missing. Set it in backend/.env.")

    if not settings.supabase_key:
        raise RuntimeError(
            "Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in backend/.env."
        )

    return settings.supabase_url, settings.supabase_key


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    url, key = _get_supabase_credentials()
    return create_client(url, key)


def is_supabase_configured() -> bool:
    return bool(settings.supabase_url and settings.supabase_key)