from datetime import datetime

from pydantic import BaseModel, Field


class LikeToggleRequest(BaseModel):
    user_id: str


class TweetEngagementSummary(BaseModel):
    tweet_id: str
    likes_count: int
    comments_count: int
    liked_by_user: bool


class EngagementBatchRequest(BaseModel):
    tweet_ids: list[str] = Field(..., min_length=1, max_length=200)
    user_id: str | None = None


class CommentCreate(BaseModel):
    user_id: str
    content: str = Field(..., min_length=1, max_length=1000)
    parent_comment_id: str | None = None


class CommentResponse(BaseModel):
    id: str
    tweet_id: str
    user_id: str
    user_name: str
    user_handle: str
    profile_picture_url: str | None
    content: str
    parent_comment_id: str | None
    created_at: datetime
    updated_at: datetime
