from pydantic import BaseModel, Field


class TweetDraft(BaseModel):
    text: str = Field(..., min_length=1, max_length=280)


class TweetStubResponse(BaseModel):
    id: str
    text: str
    message: str
