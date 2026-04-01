from app.schemas.tweet import (
    TweetCreate,
    TweetResponse,
    MediaResponse,
    PollResponse,
    PollOptionResponse,
    TweetDraft,
    TweetStubResponse,
)
from app.db.supabase import get_supabase_client
from fastapi import HTTPException


class TweetService:
    def __init__(self):
        self.supabase = get_supabase_client()

    def _get_tweet_poll(self, tweet_id: str) -> PollResponse | None:
        poll_result = self.supabase.table("polls").select("*").eq("tweet_id", tweet_id).limit(1).execute()

        if not poll_result.data:
            return None

        poll = poll_result.data[0]
        poll_options_result = self.supabase.table("poll_options").select("*").eq("poll_id", poll["id"]).order("position").execute()
        poll_options = [PollOptionResponse(**option) for option in poll_options_result.data] if poll_options_result.data else []

        return PollResponse(
            id=poll["id"],
            tweet_id=poll["tweet_id"],
            question=poll["question"],
            created_at=poll["created_at"],
            options=poll_options,
        )

    # async def _create_tweet_record(self, tweet_data: ThreadTweetCreate, user_id: str) -> TweetResponse:
    #     created = await self.create_tweet(
    #         TweetCreate(
    #             user_id=user_id,
    #             text=tweet_data.text,
    #             media=tweet_data.media,
    #             poll=tweet_data.poll,
    #         )
    #     )
    #     return created

    async def create_tweet(self, tweet_data: TweetCreate) -> TweetResponse:
        """Create a new tweet record without media or poll attachments."""
        try:
            tweet_result = self.supabase.table("tweets").insert({
                "user_id": tweet_data.user_id,
                "text": tweet_data.text
            }).execute()

            if not tweet_result.data:
                raise HTTPException(status_code=500, detail="Failed to create tweet")

            tweet = tweet_result.data[0]

            return TweetResponse(
                id=tweet["id"],
                user_id=tweet["user_id"],
                text=tweet["text"],
                created_at=tweet["created_at"],
            )

        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error creating tweet: {str(e)}")

    # async def create_thread(self, thread_data: ThreadCreate) -> ThreadResponse:
    #     """Create a thread and all tweets in order, rolling back if any step fails."""
    #     thread_id: str | None = None
    #     created_tweet_ids: list[str] = []

    #     try:
    #         thread_result = self.supabase.table("threads").insert({
    #             "user_id": thread_data.user_id,
    #             "status": "published",
    #         }).execute()

    #         if not thread_result.data:
    #             raise HTTPException(status_code=500, detail="Failed to create thread")

    #         thread = thread_result.data[0]
    #         thread_id = thread["id"]
    #         created_tweets: list[TweetResponse] = []

    #         for index, tweet_payload in enumerate(thread_data.tweets, start=1):
    #             created_tweet = await self._create_tweet_record(tweet_payload, thread_data.user_id)
    #             created_tweet_ids.append(created_tweet.id)
    #             created_tweets.append(created_tweet)

    #             thread_tweet_result = self.supabase.table("thread_tweets").insert({
    #                 "thread_id": thread_id,
    #                 "tweet_id": created_tweet.id,
    #                 "position": index,
    #             }).execute()

    #             if not thread_tweet_result.data:
    #                 raise HTTPException(status_code=500, detail="Failed to link tweet to thread")

    #         return ThreadResponse(
    #             id=thread["id"],
    #             user_id=thread["user_id"],
    #             created_at=thread["created_at"],
    #             updated_at=thread["updated_at"],
    #             status=thread["status"],
    #             tweets=created_tweets,
    #         )

    #     except Exception as e:
    #         for tweet_id in created_tweet_ids:
    #             try:
    #                 self.supabase.table("tweets").delete().eq("id", tweet_id).execute()
    #             except Exception:
    #                 pass

    #         if thread_id:
    #             try:
    #                 self.supabase.table("threads").delete().eq("id", thread_id).execute()
    #             except Exception:
    #                 pass

    #         if isinstance(e, HTTPException):
    #             raise e
    #         raise HTTPException(status_code=500, detail=f"Error creating thread: {str(e)}")

    async def get_tweet(self, tweet_id: str) -> TweetResponse:
        """Get a tweet by ID with its media and poll."""
        try:
            # Get tweet
            tweet_result = self.supabase.table("tweets").select("*").eq("id", tweet_id).execute()

            if not tweet_result.data:
                raise HTTPException(status_code=404, detail="Tweet not found")

            tweet = tweet_result.data[0]

            # Get associated media
            media_result = self.supabase.table("media").select("*").eq("tweet_id", tweet_id).execute()

            media_responses = [MediaResponse(**m) for m in media_result.data] if media_result.data else []
            poll_response = self._get_tweet_poll(tweet_id)

            return TweetResponse(
                id=tweet["id"],
                user_id=tweet["user_id"],
                text=tweet["text"],
                created_at=tweet["created_at"],
                media=media_responses,
                poll=poll_response,
            )

        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error fetching tweet: {str(e)}")

    async def get_user_tweets(self, user_id: str, limit: int = 50, offset: int = 0) -> list[TweetResponse]:
        """Get all tweets for a user with media and poll data."""
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
                poll_response = self._get_tweet_poll(tweet["id"])

                tweet_responses.append(TweetResponse(
                    id=tweet["id"],
                    user_id=tweet["user_id"],
                    text=tweet["text"],
                    created_at=tweet["created_at"],
                    media=media_responses,
                    poll=poll_response,
                ))

            return tweet_responses

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error fetching tweets: {str(e)}")

    async def get_latest_tweets(self, limit: int = 15, offset: int = 0) -> list[TweetResponse]:
        tweets_result = self.supabase.table("tweets")\
            .select("*")\
            .order("created_at", desc=True)\
            .limit(limit)\
            .offset(offset)\
            .execute()

        if not tweets_result.data:
            return []

        tweet_ids = [t["id"] for t in tweets_result.data]

        # Bulk fetch media and polls — 3 calls total instead of 3N
        media_result = self.supabase.table("media").select("*").in_("tweet_id", tweet_ids).execute()
        polls_result = self.supabase.table("polls").select("*").in_("tweet_id", tweet_ids).execute()

        poll_ids = [p["id"] for p in polls_result.data] if polls_result.data else []
        poll_options_result = self.supabase.table("poll_options").select("*").in_("poll_id", poll_ids).execute() if poll_ids else None

        # Group by tweet_id / poll_id in memory
        media_by_tweet: dict = {}
        for m in (media_result.data or []):
            media_by_tweet.setdefault(m["tweet_id"], []).append(m)

        options_by_poll: dict = {}
        for o in (poll_options_result.data if poll_options_result else []):
            options_by_poll.setdefault(o["poll_id"], []).append(o)

        polls_by_tweet: dict = {}
        for p in (polls_result.data or []):
            polls_by_tweet[p["tweet_id"]] = p

        # Assemble responses
        tweet_responses = []
        for tweet in tweets_result.data:
            tid = tweet["id"]
            media_responses = [MediaResponse(**m) for m in media_by_tweet.get(tid, [])]

            poll_response = None
            if tid in polls_by_tweet:
                p = polls_by_tweet[tid]
                options = sorted(
                    [PollOptionResponse(**o) for o in options_by_poll.get(p["id"], [])],
                    key=lambda o: o.position
                )
                poll_response = PollResponse(
                    id=p["id"],
                    tweet_id=p["tweet_id"],
                    question=p["question"],
                    created_at=p["created_at"],
                    options=options,
                )

            tweet_responses.append(TweetResponse(
                id=tweet["id"],
                user_id=tweet["user_id"],
                text=tweet["text"],
                created_at=tweet["created_at"],
                media=media_responses,
                poll=poll_response,
            ))

        return tweet_responses

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

