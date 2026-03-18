from pathlib import Path
import sys


# Allow direct execution: python scripts/check_supabase_connection.py
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db.supabase import get_supabase_client


def _is_missing_users_table_error(exc: Exception) -> bool:
    error_text = str(exc)
    return "PGRST205" in error_text or "Could not find the table 'public.users'" in error_text


def main() -> None:
    try:
        client = get_supabase_client()
        response = client.table("users").select("id", count="exact").limit(1).execute()
    except Exception as exc:
        if _is_missing_users_table_error(exc):
            raise SystemExit(
                "Supabase is reachable, but table public.users was not found. "
                "Run backend/supabase/schema.sql in the Supabase SQL Editor, then retry."
            ) from exc
        raise SystemExit(f"Supabase connection failed: {exc}") from exc

    print("Supabase connection OK")
    print(
        "users table reachable. "
        f"row_count={response.count if response.count is not None else 'unknown'}"
    )


if __name__ == "__main__":
    main()