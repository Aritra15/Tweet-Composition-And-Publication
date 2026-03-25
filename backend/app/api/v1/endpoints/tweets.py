from fastapi import APIRouter, status, Query

from app.schemas.tweet import TweetCreate, TweetResponse, TweetDraft, TweetStubResponse
from app.services.tweet_service import create_tweet_stub, tweet_service


router = APIRouter()


@router.post("", response_model=TweetResponse, status_code=status.HTTP_201_CREATED)
async def create_tweet(payload: TweetCreate) -> TweetResponse:
    """
    Create a new tweet with optional media attachments.

    - **user_id**: UUID of the user creating the tweet
    - **text**: Tweet text (1-280 characters)
    - **media**: Optional list of media items (images/videos from AI or uploads)
    """
    return await tweet_service.create_tweet(payload)


@router.get("", response_model=list[TweetResponse])
async def get_latest_tweets(
    limit: int = Query(default=15, ge=1, le=100),
    offset: int = Query(default=0, ge=0)
) -> list[TweetResponse]:
    """
    Get latest tweets across all users, ordered by creation date (newest first).

    - **limit**: Maximum number of tweets to return (1-100, default: 15)
    - **offset**: Number of tweets to skip (for pagination, default: 0)
    """
    return await tweet_service.get_latest_tweets(limit, offset)


# @router.post("/thread", response_model=ThreadResponse, status_code=status.HTTP_201_CREATED)
# async def create_thread(payload: ThreadCreate) -> ThreadResponse:
#     """
#     Publish a thread in one request.

#     - **user_id**: UUID of the user creating the thread
#     - **tweets**: Ordered list of tweets in the thread (minimum 2)
#     """
#     return await tweet_service.create_thread(payload)


@router.get("/{tweet_id}", response_model=TweetResponse)
async def get_tweet(tweet_id: str) -> TweetResponse:
    """
    Get a specific tweet by ID, including all associated media.
    """
    return await tweet_service.get_tweet(tweet_id)


@router.get("/user/{user_id}", response_model=list[TweetResponse])
async def get_user_tweets(
    user_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0)
) -> list[TweetResponse]:
    """
    Get all tweets for a specific user, ordered by creation date (newest first).

    - **user_id**: UUID of the user
    - **limit**: Maximum number of tweets to return (1-100, default: 50)
    - **offset**: Number of tweets to skip (for pagination, default: 0)
    """
    return await tweet_service.get_user_tweets(user_id, limit, offset)


@router.delete("/{tweet_id}")
async def delete_tweet(tweet_id: str) -> dict:
    """
    Delete a tweet. All associated media will be automatically deleted (cascade).
    """
    return await tweet_service.delete_tweet(tweet_id)


# Legacy stub endpoint (kept for backward compatibility)
@router.post("/stub", response_model=TweetStubResponse, status_code=status.HTTP_201_CREATED)
def create_tweet_legacy(payload: TweetDraft) -> TweetStubResponse:
    return create_tweet_stub(payload)

