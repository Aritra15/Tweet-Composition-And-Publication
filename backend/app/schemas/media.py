from pydantic import BaseModel, Field
from datetime import datetime


class MediaCreate(BaseModel):
    tweet_id: str
    url: str
    type: str = Field(..., pattern="^(image|video)$")
    source: str = Field(..., pattern="^(upload|ai)$")
    alt_text: str | None = None


class MediaResponse(BaseModel):
    id: str
    tweet_id: str
    url: str
    type: str
    source: str
    alt_text: str | None
    created_at: datetime


class MediaBulkCreate(BaseModel):
    tweet_id: str
    media_items: list[MediaCreate]
