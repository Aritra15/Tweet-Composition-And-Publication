from fastapi import HTTPException

from app.db.supabase import get_supabase_client
from app.schemas.engagement import CommentCreate, CommentResponse, TweetEngagementSummary


class EngagementService:
    def __init__(self):
        self.supabase = get_supabase_client()

    async def get_summaries(self, tweet_ids: list[str], user_id: str | None = None) -> list[TweetEngagementSummary]:
        if not tweet_ids:
            return []

        likes_result = self.supabase.table("tweet_likes").select("tweet_id,user_id").in_("tweet_id", tweet_ids).execute()
        comments_result = self.supabase.table("tweet_comments").select("tweet_id").in_("tweet_id", tweet_ids).is_("deleted_at", "null").execute()

        likes_count_by_tweet: dict[str, int] = {tweet_id: 0 for tweet_id in tweet_ids}
        liked_by_user_set: set[str] = set()

        for row in (likes_result.data or []):
            tid = row["tweet_id"]
            likes_count_by_tweet[tid] = likes_count_by_tweet.get(tid, 0) + 1
            if user_id and row.get("user_id") == user_id:
                liked_by_user_set.add(tid)

        comments_count_by_tweet: dict[str, int] = {tweet_id: 0 for tweet_id in tweet_ids}
        for row in (comments_result.data or []):
            tid = row["tweet_id"]
            comments_count_by_tweet[tid] = comments_count_by_tweet.get(tid, 0) + 1

        return [
            TweetEngagementSummary(
                tweet_id=tweet_id,
                likes_count=likes_count_by_tweet.get(tweet_id, 0),
                comments_count=comments_count_by_tweet.get(tweet_id, 0),
                liked_by_user=tweet_id in liked_by_user_set,
            )
            for tweet_id in tweet_ids
        ]

    async def get_summary(self, tweet_id: str, user_id: str | None = None) -> TweetEngagementSummary:
        likes_result = self.supabase.table("tweet_likes").select("user_id").eq("tweet_id", tweet_id).execute()
        comments_result = self.supabase.table("tweet_comments").select("id").eq("tweet_id", tweet_id).is_("deleted_at", "null").execute()

        liked_by_user = False
        likes_data = likes_result.data or []
        if user_id:
            liked_by_user = any(row.get("user_id") == user_id for row in likes_data)

        return TweetEngagementSummary(
            tweet_id=tweet_id,
            likes_count=len(likes_data),
            comments_count=len(comments_result.data or []),
            liked_by_user=liked_by_user,
        )

    async def like_tweet(self, tweet_id: str, user_id: str) -> TweetEngagementSummary:
        self.supabase.table("tweet_likes").upsert(
            {"tweet_id": tweet_id, "user_id": user_id},
            on_conflict="user_id,tweet_id",
        ).execute()
        return await self.get_summary(tweet_id, user_id)

    async def unlike_tweet(self, tweet_id: str, user_id: str) -> TweetEngagementSummary:
        self.supabase.table("tweet_likes").delete().eq("tweet_id", tweet_id).eq("user_id", user_id).execute()
        return await self.get_summary(tweet_id, user_id)

    async def get_comments(self, tweet_id: str) -> list[CommentResponse]:
        comments_result = self.supabase.table("tweet_comments")\
            .select("*")\
            .eq("tweet_id", tweet_id)\
            .is_("deleted_at", "null")\
            .order("created_at", desc=True)\
            .execute()

        comments = comments_result.data or []
        if not comments:
            return []

        user_ids = list({comment["user_id"] for comment in comments})
        users_result = self.supabase.table("users").select("id, username, user_handle, profile_picture_url").in_("id", user_ids).execute()
        users_by_id = {user["id"]: user for user in (users_result.data or [])}

        return [
            CommentResponse(
                id=comment["id"],
                tweet_id=comment["tweet_id"],
                user_id=comment["user_id"],
                user_name=users_by_id.get(comment["user_id"], {}).get("username", "Unknown"),
                user_handle=users_by_id.get(comment["user_id"], {}).get("user_handle", "unknown"),
                profile_picture_url=users_by_id.get(comment["user_id"], {}).get("profile_picture_url"),
                content=comment["content"],
                parent_comment_id=comment.get("parent_comment_id"),
                created_at=comment["created_at"],
                updated_at=comment["updated_at"],
            )
            for comment in comments
        ]

    async def add_comment(self, tweet_id: str, payload: CommentCreate) -> CommentResponse:
        insert_payload = {
            "tweet_id": tweet_id,
            "user_id": payload.user_id,
            "content": payload.content.strip(),
            "parent_comment_id": payload.parent_comment_id,
        }

        result = self.supabase.table("tweet_comments").insert(insert_payload).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create comment")

        created = result.data[0]

        user_result = self.supabase.table("users").select("username, user_handle, profile_picture_url").eq("id", payload.user_id).limit(1).execute()
        user = (user_result.data or [{}])[0]

        return CommentResponse(
            id=created["id"],
            tweet_id=created["tweet_id"],
            user_id=created["user_id"],
            user_name=user.get("username", "Unknown"),
            user_handle=user.get("user_handle", "unknown"),
            profile_picture_url=user.get("profile_picture_url"),
            content=created["content"],
            parent_comment_id=created.get("parent_comment_id"),
            created_at=created["created_at"],
            updated_at=created["updated_at"],
        )


engagement_service = EngagementService()
