from app.schemas.tweet import TweetCreate, TweetResponse, MediaResponse, TweetDraft, TweetStubResponse
from app.db.supabase import get_supabase_client
from fastapi import HTTPException


class TweetService:
    def __init__(self):
        self.supabase = get_supabase_client()

    async def create_tweet(self, tweet_data: TweetCreate) -> TweetResponse:
        """Create a new tweet with optional media attachments"""
        try:
            # Insert tweet
            tweet_result = self.supabase.table("tweets").insert({
                "user_id": tweet_data.user_id,
                "text": tweet_data.text
            }).execute()

            if not tweet_result.data:
                raise HTTPException(status_code=500, detail="Failed to create tweet")

            tweet = tweet_result.data[0]
            tweet_id = tweet["id"]

            # Insert media if provided
            media_responses = []
            if tweet_data.media:
                for media_item in tweet_data.media:
                    media_result = self.supabase.table("media").insert({
                        "tweet_id": tweet_id,
                        "url": media_item.url,
                        "type": media_item.type,
                        "source": media_item.source,
                        "alt_text": media_item.alt_text
                    }).execute()

                    if media_result.data:
                        media_responses.append(MediaResponse(**media_result.data[0]))

            return TweetResponse(
                id=tweet["id"],
                user_id=tweet["user_id"],
                text=tweet["text"],
                created_at=tweet["created_at"],
                media=media_responses
            )

        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error creating tweet: {str(e)}")

    async def get_tweet(self, tweet_id: str) -> TweetResponse:
        """Get a tweet by ID with its media"""
        try:
            # Get tweet
            tweet_result = self.supabase.table("tweets").select("*").eq("id", tweet_id).execute()

            if not tweet_result.data:
                raise HTTPException(status_code=404, detail="Tweet not found")

            tweet = tweet_result.data[0]

            # Get associated media
            media_result = self.supabase.table("media").select("*").eq("tweet_id", tweet_id).execute()

            media_responses = [MediaResponse(**m) for m in media_result.data] if media_result.data else []

            return TweetResponse(
                id=tweet["id"],
                user_id=tweet["user_id"],
                text=tweet["text"],
                created_at=tweet["created_at"],
                media=media_responses
            )

        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error fetching tweet: {str(e)}")

    async def get_user_tweets(self, user_id: str, limit: int = 50, offset: int = 0) -> list[TweetResponse]:
        """Get all tweets for a user"""
        try:
            tweets_result = self.supabase.table("tweets")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .limit(limit)\
                .offset(offset)\
                .execute()

            if not tweets_result.data:
                return []

            tweet_responses = []
            for tweet in tweets_result.data:
                # Get media for each tweet
                media_result = self.supabase.table("media").select("*").eq("tweet_id", tweet["id"]).execute()
                media_responses = [MediaResponse(**m) for m in media_result.data] if media_result.data else []

                tweet_responses.append(TweetResponse(
                    id=tweet["id"],
                    user_id=tweet["user_id"],
                    text=tweet["text"],
                    created_at=tweet["created_at"],
                    media=media_responses
                ))

            return tweet_responses

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error fetching tweets: {str(e)}")

    async def delete_tweet(self, tweet_id: str) -> dict:
        """Delete a tweet (media will be cascade deleted)"""
        try:
            result = self.supabase.table("tweets").delete().eq("id", tweet_id).execute()

            if not result.data:
                raise HTTPException(status_code=404, detail="Tweet not found")

            return {"message": "Tweet deleted successfully", "id": tweet_id}

        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error deleting tweet: {str(e)}")


# For backward compatibility
def create_tweet_stub(payload: TweetDraft) -> TweetStubResponse:
    from uuid import uuid4
    return TweetStubResponse(
        id=str(uuid4()),
        text=payload.text,
        message="Stub response only. Persistence will be added later.",
    )


tweet_service = TweetService()

