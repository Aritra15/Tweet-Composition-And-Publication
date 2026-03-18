from uuid import uuid4

from app.schemas.tweet import TweetDraft, TweetStubResponse


def create_tweet_stub(payload: TweetDraft) -> TweetStubResponse:
    return TweetStubResponse(
        id=str(uuid4()),
        text=payload.text,
        message="Stub response only. Persistence will be added later.",
    )
