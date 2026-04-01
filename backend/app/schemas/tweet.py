from pydantic import BaseModel, Field
from datetime import datetime


class MediaItem(BaseModel):
    url: str
    type: str = Field(..., pattern="^(image|video)$")
    source: str = Field(..., pattern="^(upload|ai)$")
    alt_text: str | None = None


class PollOptionCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=100)


class PollCreate(BaseModel):
    question: str = Field(..., min_length=1, max_length=280)
    options: list[PollOptionCreate] = Field(..., min_length=2, max_length=4)


class PollAttachCreate(BaseModel):
    tweet_id: str
    question: str = Field(..., min_length=1, max_length=280)


class TweetCreate(BaseModel):
    user_id: str
    text: str = Field(..., min_length=1, max_length=280)


class PollOptionAttachCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=100)


# class ThreadTweetCreate(BaseModel):
#     text: str = Field(..., min_length=1, max_length=280)
#     media: list[MediaItem] = []
#     poll: PollCreate | None = None


# class ThreadCreate(BaseModel):
#     user_id: str
#     tweets: list[ThreadTweetCreate] = Field(..., min_length=2)


class MediaResponse(BaseModel):
    id: str
    tweet_id: str
    url: str
    type: str
    source: str
    alt_text: str | None
    created_at: datetime


class PollOptionResponse(BaseModel):
    id: str
    poll_id: str
    text: str
    position: int
    votes_count: int
    created_at: datetime


class PollResponse(BaseModel):
    id: str
    tweet_id: str
    question: str
    created_at: datetime
    options: list[PollOptionResponse] = []


class TweetResponse(BaseModel):
    id: str
    user_id: str
    username: str
    user_handle: str
    profile_picture_url: str | None
    text: str
    created_at: datetime
    media: list[MediaResponse] = []
    poll: PollResponse | None = None


# class ThreadResponse(BaseModel):
#     id: str
#     user_id: str
#     created_at: datetime
#     updated_at: datetime
#     status: str
#     tweets: list[TweetResponse] = []


class TweetDraft(BaseModel):
    text: str = Field(..., min_length=1, max_length=280)


class TweetStubResponse(BaseModel):
    id: str
    text: str
    message: str
