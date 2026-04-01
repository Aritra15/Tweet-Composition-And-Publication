from fastapi import HTTPException

from app.db.supabase import get_supabase_client
from app.schemas.tweet import (
    PollAttachCreate,
    PollOptionAttachCreate,
    PollOptionResponse,
    PollResponse,
)


class PollService:
    def __init__(self):
        self.supabase = get_supabase_client()

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
            return PollResponse(
                id=poll["id"],
                tweet_id=poll["tweet_id"],
                question=poll["question"],
                created_at=poll["created_at"],
                options=[],
            )
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


poll_service = PollService()
