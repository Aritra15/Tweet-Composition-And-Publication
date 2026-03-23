from fastapi import APIRouter, status

from app.schemas.media import MediaCreate, MediaResponse
from app.schemas.tweet import MediaItem
from app.services.media_service import media_service


router = APIRouter()


@router.post("", response_model=MediaResponse, status_code=status.HTTP_201_CREATED)
async def add_media(payload: MediaCreate) -> MediaResponse:
    """
    Add a single media item to an existing tweet.

    - **tweet_id**: UUID of the tweet to attach media to
    - **url**: URL or data URL of the media (can be base64 data URL or external URL)
    - **type**: Media type - either 'image' or 'video'
    - **source**: Media source - either 'ai' (AI-generated) or 'upload' (user uploaded)
    - **alt_text**: Optional accessibility description for the media
    """
    return await media_service.add_media_to_tweet(payload)


@router.post("/bulk/{tweet_id}", response_model=list[MediaResponse], status_code=status.HTTP_201_CREATED)
async def add_bulk_media(tweet_id: str, media_items: list[MediaItem]) -> list[MediaResponse]:
    """
    Add multiple media items to an existing tweet at once.

    - **tweet_id**: UUID of the tweet to attach media to
    - **media_items**: List of media items to add
    """
    return await media_service.add_bulk_media_to_tweet(tweet_id, media_items)


@router.get("/tweet/{tweet_id}", response_model=list[MediaResponse])
async def get_tweet_media(tweet_id: str) -> list[MediaResponse]:
    """
    Get all media items associated with a specific tweet.
    """
    return await media_service.get_tweet_media(tweet_id)


@router.get("/tweet/{tweet_id}/metadata")
async def get_tweet_media_metadata(tweet_id: str) -> list[dict]:
    """
    Get metadata for all media items (without large URL data) for debugging.
    """
    media_list = await media_service.get_tweet_media(tweet_id)
    return [
        {
            "id": media.id,
            "tweet_id": media.tweet_id,
            "type": media.type,
            "source": media.source,
            "alt_text": media.alt_text,
            "created_at": media.created_at,
            "url_length": len(media.url)
        }
        for media in media_list
    ]


@router.delete("/{media_id}")
async def delete_media(media_id: str) -> dict:
    """
    Delete a specific media item by its ID.
    """
    return await media_service.delete_media(media_id)
