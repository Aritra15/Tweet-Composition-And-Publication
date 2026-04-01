from fastapi import APIRouter

from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest
from app.services.auth_service import auth_service

router = APIRouter()


@router.post("/register", response_model=AuthResponse)
def register(body: RegisterRequest) -> AuthResponse:
    return auth_service.register(
        username=body.username,
        email=body.email,
        password=body.password,
    )


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest) -> AuthResponse:
    return auth_service.login(email=body.email, password=body.password)
