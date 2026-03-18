from fastapi import APIRouter, status

from app.schemas.tweet import TweetDraft, TweetStubResponse
from app.services.tweet_service import create_tweet_stub


router = APIRouter()


@router.post("", response_model=TweetStubResponse, status_code=status.HTTP_201_CREATED)
def create_tweet(payload: TweetDraft) -> TweetStubResponse:
    return create_tweet_stub(payload)
