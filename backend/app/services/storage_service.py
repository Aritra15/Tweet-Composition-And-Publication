# app/services/storage_service.py
import base64
import uuid
from app.db.supabase import get_supabase_client

BUCKET_NAME = "media"

class StorageService:
    def __init__(self):
        self.supabase = get_supabase_client()

    def upload_base64(self, data_url: str, folder: str = "uploads") -> str:
        if not data_url.startswith("data:"):
            return data_url

        header, encoded = data_url.split(",", 1)
        mime_type = header.split(":")[1].split(";")[0]
        
        print(f"Uploading media — mime_type: {mime_type}, data size: {len(encoded)} chars")

        extension_map = {
            "image/png": "png",
            "image/jpeg": "jpg",
            "image/gif": "gif",
            "image/webp": "webp",
            "video/mp4": "mp4",
            "video/webm": "webm",
            "video/quicktime": "mov",
            "video/x-msvideo": "avi",
        }

        extension = extension_map.get(mime_type, mime_type.split("/")[1])
        file_bytes = base64.b64decode(encoded)
        filename = f"{folder}/{uuid.uuid4()}.{extension}"

        upload_result = self.supabase.storage.from_(BUCKET_NAME).upload(
            path=filename,
            file=file_bytes,
            file_options={"content-type": mime_type}
        )

        print(f"Upload result: {upload_result}")

        result = self.supabase.storage.from_(BUCKET_NAME).get_public_url(filename)

        return result


storage_service = StorageService()