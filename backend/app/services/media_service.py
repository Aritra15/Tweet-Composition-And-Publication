from app.schemas.media import MediaCreate, MediaResponse
from app.schemas.tweet import MediaItem
from app.db.supabase import get_supabase_client
from fastapi import HTTPException
from app.services.storage_service import storage_service


class MediaService:
    def __init__(self):
        self.supabase = get_supabase_client()

    async def add_media_to_tweet(self, media_data: MediaCreate) -> MediaResponse:
        """Add a single media item to an existing tweet"""
        try:
            # Verify tweet exists
            tweet_check = self.supabase.table("tweets").select("id").eq("id", media_data.tweet_id).execute()

            if not tweet_check.data:
                raise HTTPException(status_code=404, detail=f"Tweet with id {media_data.tweet_id} not found")

            url = media_data.url
            if url.startswith("data:"):
                url = storage_service.upload_base64(url, folder="tweets")

            # Insert media
            media_result = self.supabase.table("media").insert({
                "tweet_id": media_data.tweet_id,
                "url": url,
                "type": media_data.type,
                "source": media_data.source,
                "alt_text": media_data.alt_text
            }).execute()

            if not media_result.data:
                raise HTTPException(status_code=500, detail="Failed to add media")

            return MediaResponse(**media_result.data[0])

        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error adding media: {str(e)}")

    async def add_bulk_media_to_tweet(self, tweet_id: str, media_items: list[MediaItem]) -> list[MediaResponse]:
        """Add multiple media items to an existing tweet"""
        try:
            # Verify tweet exists
            tweet_check = self.supabase.table("tweets").select("id").eq("id", tweet_id).execute()

            if not tweet_check.data:
                raise HTTPException(status_code=404, detail=f"Tweet with id {tweet_id} not found")

            media_responses = []
            for media_item in media_items:
                url = media_item.url
                if url.startswith("data:"):
                    url = storage_service.upload_base64(url, folder="tweets")

                media_result = self.supabase.table("media").insert({
                    "tweet_id": tweet_id,
                    "url": url,
                    "type": media_item.type,
                    "source": media_item.source,
                    "alt_text": media_item.alt_text
                }).execute()

                if media_result.data:
                    media_responses.append(MediaResponse(**media_result.data[0]))

            return media_responses

        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error adding bulk media: {str(e)}")

    async def get_tweet_media(self, tweet_id: str) -> list[MediaResponse]:
        """Get all media for a specific tweet"""
        try:
            media_result = self.supabase.table("media").select("*").eq("tweet_id", tweet_id).execute()

            if not media_result.data:
                return []

            return [MediaResponse(**m) for m in media_result.data]

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error fetching media: {str(e)}")

    async def delete_media(self, media_id: str) -> dict:
        """Delete a specific media item"""
        try:
            result = self.supabase.table("media").delete().eq("id", media_id).execute()

            if not result.data:
                raise HTTPException(status_code=404, detail="Media not found")

            return {"message": "Media deleted successfully", "id": media_id}

        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Error deleting media: {str(e)}")


media_service = MediaService()
