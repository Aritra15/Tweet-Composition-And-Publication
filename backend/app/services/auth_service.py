from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import HTTPException
from jose import jwt

from app.core.config import settings
from app.db.supabase import get_supabase_client
from app.schemas.auth import AuthResponse, UserOut


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _create_token(user_id: str, username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_expire_days)
    payload = {"sub": user_id, "username": username, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


class AuthService:
    def __init__(self):
        self.supabase = get_supabase_client()

    def register(self, username: str, email: str, password: str) -> AuthResponse:
        # Check for duplicate email or username
        existing = (
            self.supabase.table("users")
            .select("id")
            .or_(f"email.eq.{email},username.eq.{username}")
            .execute()
        )
        if existing.data:
            raise HTTPException(status_code=409, detail="Email or username already taken")

        result = (
            self.supabase.table("users")
            .insert({
                "username": username,
                "email": email,
                "password_hash": _hash_password(password),
            })
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create user")

        user = result.data[0]
        token = _create_token(user["id"], user["username"])
        return AuthResponse(token=token, user=UserOut(id=user["id"], username=user["username"], email=user["email"]))

    def login(self, email: str, password: str) -> AuthResponse:
        result = (
            self.supabase.table("users")
            .select("*")
            .eq("email", email)
            .limit(1)
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        user = result.data[0]

        if not _verify_password(password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token = _create_token(user["id"], user["username"])
        return AuthResponse(token=token, user=UserOut(id=user["id"], username=user["username"], email=user["email"]))


auth_service = AuthService()
