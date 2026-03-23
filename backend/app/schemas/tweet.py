from pydantic import BaseModel, Field
from datetime import datetime


class MediaItem(BaseModel):
    url: str
    type: str = Field(..., pattern="^(image|video)$")
    source: str = Field(..., pattern="^(upload|ai)$")
    alt_text: str | None = None


class TweetCreate(BaseModel):
    user_id: str
    text: str = Field(..., min_length=1, max_length=280)
    media: list[MediaItem] = []


class MediaResponse(BaseModel):
    id: str
    tweet_id: str
    url: str
    type: str
    source: str
    alt_text: str | None
    created_at: datetime


class TweetResponse(BaseModel):
    id: str
    user_id: str
    text: str
    created_at: datetime
    media: list[MediaResponse] = []


class TweetDraft(BaseModel):
    text: str = Field(..., min_length=1, max_length=280)


class TweetStubResponse(BaseModel):
    id: str
    text: str
    message: str
