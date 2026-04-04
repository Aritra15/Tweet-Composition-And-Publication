from app.schemas.tweet import (
    TweetCreate,
    TweetResponse,
    MediaResponse,
    PollResponse,
    PollOptionResponse,
    ThreadLinkCreate,
    ThreadLinkResponse,
    TweetDraft,
    TweetStubResponse,
)
from app.db.supabase import get_supabase_client
from fastapi import HTTPException


class TweetService:
    def __init__(self):
        self.supabase = get_supabase_client()

    def _get_thread_meta_for_tweet(self, tweet_id: str) -> dict[str, str | int] | None:
        thread_result = self.supabase.table("thread_tweets")\
            .select("thread_id,position")\
            .eq("tweet_id", tweet_id)\
            .limit(1)\
            .execute()

        if not thread_result.data:
            return None

        return {
            "thread_id": thread_result.data[0]["thread_id"],
            "thread_position": thread_result.data[0]["position"],
        }

    def _get_tweet_poll(self, tweet_id: str, viewer_user_id: str | None = None) -> PollResponse | None:
        poll_result = self.supabase.table("polls").select("*").eq("tweet_id", tweet_id).limit(1).execute()

        if not poll_result.data:
            return None

        poll = poll_result.data[0]
        poll_options_result = self.supabase.table("poll_options").select("*").eq("poll_id", poll["id"]).order("position").execute()
        option_rows = poll_options_result.data or []
        option_ids = [row["id"] for row in option_rows]

        votes_by_option: dict[str, int] = {option_id: 0 for option_id in option_ids}
        voted_option_id: str | None = None

        if option_ids:
            poll_votes_result = self.supabase.table("poll_votes").select("option_id,user_id").eq("poll_id", poll["id"]).execute()
            for vote_row in (poll_votes_result.data or []):
                option_id = vote_row["option_id"]
                votes_by_option[option_id] = votes_by_option.get(option_id, 0) + 1
                if viewer_user_id and vote_row.get("user_id") == viewer_user_id:
                    voted_option_id = option_id

        poll_options = [
            PollOptionResponse(
                id=option["id"],
                poll_id=option["poll_id"],
                text=option["text"],
                position=option["position"],
                votes_count=votes_by_option.get(option["id"], 0),
                created_at=option["created_at"],
            )
            for option in option_rows
        ]

        return PollResponse(
            id=poll["id"],
            tweet_id=poll["tweet_id"],
            question=poll["question"],
            created_at=poll["created_at"],
            options=poll_options,
            voted_option_id=voted_option_id,
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

            user_info = self.supabase.table("users").select("username", "user_handle", "profile_picture_url").eq("id", tweet["user_id"]).execute()
            user = user_info.data[0]

            return TweetResponse(
                id=tweet["id"],
                user_id=tweet["user_id"],
                username=user["username"],
                user_handle=user["user_handle"],
                profile_picture_url=user["profile_picture_url"],
                text=tweet["text"],
                created_at=tweet["created_at"],
                likes_count=0,
                comments_count=0,
                liked_by_user=False,
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

    async def get_tweet(self, tweet_id: str, viewer_user_id: str | None = None) -> TweetResponse:
        """Get a tweet by ID with its media and poll."""
        try:
            # Get tweet
            tweet_result = self.supabase.table("tweets").select("*").eq("id", tweet_id).execute()

            if not tweet_result.data:
                raise HTTPException(status_code=404, detail="Tweet not found")

            tweet = tweet_result.data[0]

            user_info = self.supabase.table("users").select("username", "user_handle", "profile_picture_url").eq("id", tweet["user_id"]).execute()
            user = user_info.data[0]

            # Get associated media
            media_result = self.supabase.table("media").select("*").eq("tweet_id", tweet_id).execute()

            media_responses = [MediaResponse(**m) for m in media_result.data] if media_result.data else []
            poll_response = self._get_tweet_poll(tweet_id, viewer_user_id)
            thread_meta = self._get_thread_meta_for_tweet(tweet_id)

            likes_result = self.supabase.table("tweet_likes").select("user_id").eq("tweet_id", tweet_id).execute()
            comments_result = self.supabase.table("tweet_comments").select("id").eq("tweet_id", tweet_id).is_("deleted_at", "null").execute()

            likes_data = likes_result.data or []
            liked_by_user = False
            if viewer_user_id:
                liked_by_user = any(row.get("user_id") == viewer_user_id for row in likes_data)

            return TweetResponse(
                id=tweet["id"],
                user_id=tweet["user_id"],
                username=user["username"],
                user_handle=user["user_handle"],
                profile_picture_url=user["profile_picture_url"],
                text=tweet["text"],
                created_at=tweet["created_at"],
                likes_count=len(likes_data),
                comments_count=len(comments_result.data or []),
                liked_by_user=liked_by_user,
                media=media_responses,
                poll=poll_response,
                thread_id=thread_meta["thread_id"] if thread_meta else None,
                thread_position=thread_meta["thread_position"] if thread_meta else None,
            )

        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error fetching tweet: {str(e)}")

    async def get_user_tweets(self, user_id: str, limit: int = 50, offset: int = 0, viewer_user_id: str | None = None) -> list[TweetResponse]:
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

            user_result = self.supabase.table("users")\
                .select("id,username,user_handle,profile_picture_url")\
                .eq("id", user_id)\
                .limit(1)\
                .execute()
            user_info = (user_result.data or [{}])[0]

            tweet_responses = []
            for tweet in tweets_result.data:
                # Get media for each tweet
                media_result = self.supabase.table("media").select("*").eq("tweet_id", tweet["id"]).execute()
                media_responses = [MediaResponse(**m) for m in media_result.data] if media_result.data else []
                poll_response = self._get_tweet_poll(tweet["id"], viewer_user_id)
                thread_meta = self._get_thread_meta_for_tweet(tweet["id"])
                likes_result = self.supabase.table("tweet_likes").select("user_id").eq("tweet_id", tweet["id"]).execute()
                comments_result = self.supabase.table("tweet_comments").select("id").eq("tweet_id", tweet["id"]).is_("deleted_at", "null").execute()
                likes_data = likes_result.data or []
                liked_by_user = False
                if viewer_user_id:
                    liked_by_user = any(row.get("user_id") == viewer_user_id for row in likes_data)

                tweet_responses.append(TweetResponse(
                    id=tweet["id"],
                    user_id=tweet["user_id"],
                    username=user_info.get("username", ""),
                    user_handle=user_info.get("user_handle", ""),
                    profile_picture_url=user_info.get("profile_picture_url"),
                    text=tweet["text"],
                    created_at=tweet["created_at"],
                    likes_count=len(likes_data),
                    comments_count=len(comments_result.data or []),
                    liked_by_user=liked_by_user,
                    media=media_responses,
                    poll=poll_response,
                    thread_id=thread_meta["thread_id"] if thread_meta else None,
                    thread_position=thread_meta["thread_position"] if thread_meta else None,
                ))

            return tweet_responses

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error fetching tweets: {str(e)}")

    async def get_latest_tweets(self, limit: int = 15, offset: int = 0, viewer_user_id: str | None = None) -> list[TweetResponse]:
        tweets_result = self.supabase.table("tweets")\
            .select("*")\
            .order("created_at", desc=True)\
            .limit(limit)\
            .offset(offset)\
            .execute()

        if not tweets_result.data:
            return []

        visible_tweets = list(tweets_result.data)
        initial_tweet_ids = [tweet["id"] for tweet in visible_tweets]

        # If any tweet in the page belongs to a thread, include all tweets from that thread
        # so the UI can consistently render thread polls and vote state after refresh.
        initial_thread_rows_result = self.supabase.table("thread_tweets")\
            .select("tweet_id,thread_id,position")\
            .in_("tweet_id", initial_tweet_ids)\
            .execute()

        initial_thread_rows = initial_thread_rows_result.data or []
        thread_ids = list({row["thread_id"] for row in initial_thread_rows})
        thread_rows = initial_thread_rows

        if thread_ids:
            full_thread_rows_result = self.supabase.table("thread_tweets")\
                .select("tweet_id,thread_id,position")\
                .in_("thread_id", thread_ids)\
                .execute()

            thread_rows = full_thread_rows_result.data or []
            all_thread_tweet_ids = {row["tweet_id"] for row in thread_rows}
            known_ids = {tweet["id"] for tweet in visible_tweets}
            missing_tweet_ids = [tweet_id for tweet_id in all_thread_tweet_ids if tweet_id not in known_ids]

            if missing_tweet_ids:
                missing_tweets_result = self.supabase.table("tweets")\
                    .select("*")\
                    .in_("id", missing_tweet_ids)\
                    .execute()

                visible_tweets.extend(missing_tweets_result.data or [])

        # Dedupe while preserving order: page tweets first, then appended thread siblings.
        tweets_by_id: dict[str, dict] = {}
        ordered_tweet_ids: list[str] = []
        for tweet in visible_tweets:
            tweet_id = tweet["id"]
            if tweet_id in tweets_by_id:
                continue
            tweets_by_id[tweet_id] = tweet
            ordered_tweet_ids.append(tweet_id)

        expanded_tweets = [tweets_by_id[tweet_id] for tweet_id in ordered_tweet_ids]
        tweet_ids = ordered_tweet_ids
        user_ids = list({tweet["user_id"] for tweet in expanded_tweets})

        # Bulk fetch user info for all tweets to avoid N+1 query problem
        users_result = self.supabase.table("users").select("id", "username", "user_handle", "profile_picture_url").in_("id", user_ids).execute()
        users_by_id = {u["id"]: u for u in users_result.data} if users_result.data else {}

        # Bulk fetch media and polls — 3 calls total instead of 3N
        media_result = self.supabase.table("media").select("*").in_("tweet_id", tweet_ids).execute()
        polls_result = self.supabase.table("polls").select("*").in_("tweet_id", tweet_ids).execute()
        likes_result = self.supabase.table("tweet_likes").select("tweet_id,user_id").in_("tweet_id", tweet_ids).execute()
        comments_result = self.supabase.table("tweet_comments").select("tweet_id").in_("tweet_id", tweet_ids).is_("deleted_at", "null").execute()

        poll_ids = [p["id"] for p in polls_result.data] if polls_result.data else []
        poll_options_result = self.supabase.table("poll_options").select("*").in_("poll_id", poll_ids).execute() if poll_ids else None
        poll_votes_result = self.supabase.table("poll_votes").select("poll_id,option_id,user_id").in_("poll_id", poll_ids).execute() if poll_ids else None

        # Group by tweet_id / poll_id in memory
        media_by_tweet: dict = {}
        for m in (media_result.data or []):
            media_by_tweet.setdefault(m["tweet_id"], []).append(m)

        options_by_poll: dict = {}
        for o in (poll_options_result.data if poll_options_result else []):
            options_by_poll.setdefault(o["poll_id"], []).append(o)

        poll_vote_count_by_option: dict[str, int] = {}
        voted_option_by_poll: dict[str, str] = {}
        for vote_row in (poll_votes_result.data if poll_votes_result else []):
            option_id = vote_row["option_id"]
            poll_vote_count_by_option[option_id] = poll_vote_count_by_option.get(option_id, 0) + 1
            if viewer_user_id and vote_row.get("user_id") == viewer_user_id:
                voted_option_by_poll[vote_row["poll_id"]] = option_id

        polls_by_tweet: dict = {}
        for p in (polls_result.data or []):
            polls_by_tweet[p["tweet_id"]] = p

        thread_meta_by_tweet: dict[str, dict[str, str | int]] = {
            row["tweet_id"]: {
                "thread_id": row["thread_id"],
                "thread_position": row["position"],
            }
            for row in thread_rows
        }

        likes_count_by_tweet: dict[str, int] = {}
        liked_by_user_by_tweet: dict[str, bool] = {}
        for like_row in (likes_result.data or []):
            tid = like_row["tweet_id"]
            likes_count_by_tweet[tid] = likes_count_by_tweet.get(tid, 0) + 1
            if viewer_user_id and like_row.get("user_id") == viewer_user_id:
                liked_by_user_by_tweet[tid] = True

        comments_count_by_tweet: dict[str, int] = {}
        for comment_row in (comments_result.data or []):
            tid = comment_row["tweet_id"]
            comments_count_by_tweet[tid] = comments_count_by_tweet.get(tid, 0) + 1

        # Assemble responses
        tweet_responses = []
        for tweet in expanded_tweets:
            tid = tweet["id"]
            media_responses = [MediaResponse(**m) for m in media_by_tweet.get(tid, [])]

            poll_response = None
            if tid in polls_by_tweet:
                p = polls_by_tweet[tid]
                options = sorted(
                    [
                        PollOptionResponse(
                            id=o["id"],
                            poll_id=o["poll_id"],
                            text=o["text"],
                            position=o["position"],
                            votes_count=poll_vote_count_by_option.get(o["id"], 0),
                            created_at=o["created_at"],
                        )
                        for o in options_by_poll.get(p["id"], [])
                    ],
                    key=lambda o: o.position
                )
                poll_response = PollResponse(
                    id=p["id"],
                    tweet_id=p["tweet_id"],
                    question=p["question"],
                    created_at=p["created_at"],
                    options=options,
                    voted_option_id=voted_option_by_poll.get(p["id"]),
                )

            tweet_responses.append(TweetResponse(
                id=tweet["id"],
                user_id=tweet["user_id"],
                user_handle=users_by_id.get(tweet["user_id"], {}).get("user_handle", ""),
                username=users_by_id.get(tweet["user_id"], {}).get("username", ""),
                profile_picture_url=users_by_id.get(tweet["user_id"], {}).get("profile_picture_url"),
                text=tweet["text"],
                created_at=tweet["created_at"],
                likes_count=likes_count_by_tweet.get(tid, 0),
                comments_count=comments_count_by_tweet.get(tid, 0),
                liked_by_user=liked_by_user_by_tweet.get(tid, False),
                media=media_responses,
                poll=poll_response,
                thread_id=thread_meta_by_tweet.get(tid, {}).get("thread_id"),
                thread_position=thread_meta_by_tweet.get(tid, {}).get("thread_position"),
            ))

        return tweet_responses

    async def link_tweets_to_thread(self, payload: ThreadLinkCreate) -> ThreadLinkResponse:
        """Create a thread and attach existing tweets in the specified order."""
        tweet_ids = payload.tweet_ids
        unique_tweet_ids = list(dict.fromkeys(tweet_ids))
        if len(unique_tweet_ids) < 2:
            raise HTTPException(status_code=400, detail="A thread requires at least two distinct tweets")

        tweets_result = self.supabase.table("tweets")\
            .select("id,user_id")\
            .in_("id", unique_tweet_ids)\
            .eq("user_id", payload.user_id)\
            .execute()

        if len(tweets_result.data or []) != len(unique_tweet_ids):
            raise HTTPException(status_code=400, detail="All tweets must exist and belong to the requesting user")

        linked_result = self.supabase.table("thread_tweets").select("tweet_id").in_("tweet_id", unique_tweet_ids).execute()
        if linked_result.data:
            raise HTTPException(status_code=409, detail="One or more tweets are already linked to a thread")

        thread_result = self.supabase.table("threads").insert({
            "user_id": payload.user_id,
            "status": "published",
        }).execute()

        if not thread_result.data:
            raise HTTPException(status_code=500, detail="Failed to create thread")

        thread_id = thread_result.data[0]["id"]

        try:
            thread_links = [
                {
                    "thread_id": thread_id,
                    "tweet_id": tweet_id,
                    "position": index,
                }
                for index, tweet_id in enumerate(unique_tweet_ids, start=1)
            ]

            link_result = self.supabase.table("thread_tweets").insert(thread_links).execute()
            if not link_result.data:
                raise HTTPException(status_code=500, detail="Failed to attach tweets to thread")

            return ThreadLinkResponse(thread_id=thread_id, tweet_ids=unique_tweet_ids)
        except Exception:
            self.supabase.table("threads").delete().eq("id", thread_id).execute()
            raise

    async def delete_thread(self, thread_id: str, user_id: str) -> dict:
        """Delete an entire thread and all its tweets."""
        thread_result = self.supabase.table("threads")\
            .select("id,user_id")\
            .eq("id", thread_id)\
            .limit(1)\
            .execute()

        if not thread_result.data:
            raise HTTPException(status_code=404, detail="Thread not found")

        thread = thread_result.data[0]
        if thread["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="You can only delete your own threads")

        thread_tweets_result = self.supabase.table("thread_tweets")\
            .select("tweet_id")\
            .eq("thread_id", thread_id)\
            .order("position")\
            .execute()

        tweet_ids = [row["tweet_id"] for row in (thread_tweets_result.data or [])]
        if tweet_ids:
            self.supabase.table("tweets").delete().in_("id", tweet_ids).eq("user_id", user_id).execute()

        self.supabase.table("threads").delete().eq("id", thread_id).eq("user_id", user_id).execute()

        return {"message": "Thread deleted successfully", "id": thread_id}

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

