from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    username: str
    user_handle: str = Field(alias="userHandle")
    profile_picture_url: str | None = Field(default=None, alias="profilePictureUrl")
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    username: str
    user_handle: str
    profile_picture_url: str | None
    email: str


class AuthResponse(BaseModel):
    token: str
    user: UserOut
