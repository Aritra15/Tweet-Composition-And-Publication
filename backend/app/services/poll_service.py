from fastapi import HTTPException

from app.db.supabase import get_supabase_client
from app.schemas.tweet import (
    PollAttachCreate,
    PollOptionAttachCreate,
    PollVoteCreate,
    PollOptionResponse,
    PollResponse,
)


class PollService:
    def __init__(self):
        self.supabase = get_supabase_client()

    def _build_poll_response(self, poll: dict, viewer_user_id: str | None = None) -> PollResponse:
        options_result = self.supabase.table("poll_options").select("*").eq("poll_id", poll["id"]).order("position").execute()
        options_rows = options_result.data or []

        option_ids = [row["id"] for row in options_rows]
        votes_by_option: dict[str, int] = {option_id: 0 for option_id in option_ids}
        voted_option_id: str | None = None

        if option_ids:
            votes_result = self.supabase.table("poll_votes").select("option_id,user_id").eq("poll_id", poll["id"]).execute()
            for vote_row in (votes_result.data or []):
                option_id = vote_row["option_id"]
                votes_by_option[option_id] = votes_by_option.get(option_id, 0) + 1
                if viewer_user_id and vote_row.get("user_id") == viewer_user_id:
                    voted_option_id = option_id

        options = [
            PollOptionResponse(
                id=row["id"],
                poll_id=row["poll_id"],
                text=row["text"],
                position=row["position"],
                votes_count=votes_by_option.get(row["id"], 0),
                created_at=row["created_at"],
            )
            for row in options_rows
        ]

        return PollResponse(
            id=poll["id"],
            tweet_id=poll["tweet_id"],
            question=poll["question"],
            created_at=poll["created_at"],
            options=options,
            voted_option_id=voted_option_id,
        )

    async def create_poll(self, poll_data: PollAttachCreate) -> PollResponse:
        """Create a poll for an existing tweet without options."""
        try:
            tweet_result = self.supabase.table("tweets").select("id").eq("id", poll_data.tweet_id).limit(1).execute()
            if not tweet_result.data:
                raise HTTPException(status_code=404, detail=f"Tweet with id {poll_data.tweet_id} not found")

            existing_poll = self.supabase.table("polls").select("id").eq("tweet_id", poll_data.tweet_id).limit(1).execute()
            if existing_poll.data:
                raise HTTPException(status_code=409, detail="Poll already exists for this tweet")

            poll_result = self.supabase.table("polls").insert({
                "tweet_id": poll_data.tweet_id,
                "question": poll_data.question,
            }).execute()

            if not poll_result.data:
                raise HTTPException(status_code=500, detail="Failed to create poll")

            poll = poll_result.data[0]
            return self._build_poll_response(poll)
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error creating poll: {str(e)}")

    async def add_poll_option(self, poll_id: str, option_data: PollOptionAttachCreate) -> PollOptionResponse:
        """Add a single option to an existing poll with auto-incremented position."""
        try:
            poll_result = self.supabase.table("polls").select("id").eq("id", poll_id).limit(1).execute()
            if not poll_result.data:
                raise HTTPException(status_code=404, detail=f"Poll with id {poll_id} not found")

            existing_options_result = self.supabase.table("poll_options").select("position").eq("poll_id", poll_id).execute()
            existing_count = len(existing_options_result.data or [])

            if existing_count >= 4:
                raise HTTPException(status_code=400, detail="A poll can have at most 4 options")

            option_result = self.supabase.table("poll_options").insert({
                "poll_id": poll_id,
                "text": option_data.text,
                "position": existing_count + 1,
            }).execute()

            if not option_result.data:
                raise HTTPException(status_code=500, detail="Failed to create poll option")

            return PollOptionResponse(**option_result.data[0])
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error creating poll option: {str(e)}")

    async def vote_poll(self, poll_id: str, payload: PollVoteCreate) -> PollResponse:
        """Cast or change a poll vote for a user and return updated poll state."""
        try:
            poll_result = self.supabase.table("polls").select("*").eq("id", poll_id).limit(1).execute()
            if not poll_result.data:
                raise HTTPException(status_code=404, detail=f"Poll with id {poll_id} not found")

            poll = poll_result.data[0]

            option_result = self.supabase.table("poll_options")\
                .select("id")\
                .eq("id", payload.option_id)\
                .eq("poll_id", poll_id)\
                .limit(1)\
                .execute()

            if not option_result.data:
                raise HTTPException(status_code=400, detail="Selected option does not belong to this poll")

            user_result = self.supabase.table("users").select("id").eq("id", payload.user_id).limit(1).execute()
            if not user_result.data:
                raise HTTPException(status_code=404, detail=f"User with id {payload.user_id} not found")

            self.supabase.table("poll_votes").upsert(
                {
                    "poll_id": poll_id,
                    "option_id": payload.option_id,
                    "user_id": payload.user_id,
                },
                on_conflict="poll_id,user_id",
            ).execute()

            return self._build_poll_response(poll, viewer_user_id=payload.user_id)
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error voting on poll: {str(e)}")


poll_service = PollService()
