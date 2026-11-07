import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client


# Load backend environment variables.
BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")


@lru_cache(maxsize=1)
def get_storage_client():
    """Create and reuse the private Supabase Storage client."""

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_secret_key = os.getenv("SUPABASE_SECRET_KEY")

    if not supabase_url or not supabase_secret_key:
        raise RuntimeError(
            "Supabase URL or secret key is missing from backend/.env"
        )

    return create_client(supabase_url, supabase_secret_key)


def get_storage_bucket():
    """Return the configured private storage bucket."""

    bucket = os.getenv("SUPABASE_BUCKET")

    if not bucket:
        raise RuntimeError(
            "SUPABASE_BUCKET is missing from backend/.env"
        )

    return bucket


def upload_file(object_path: str, file_content: bytes, content_type: str):
    """Upload a document to private Supabase Storage."""

    return (
        get_storage_client()
        .storage
        .from_(get_storage_bucket())
        .upload(
            object_path,
            file_content,
            file_options={
                "content-type": content_type,
                "upsert": "false"
            }
        )
    )


def download_file(object_path: str) -> bytes:
    """Download a document from private Supabase Storage."""

    return (
        get_storage_client()
        .storage
        .from_(get_storage_bucket())
        .download(object_path)
    )


def delete_file(object_path: str):
    """Remove a document from private Supabase Storage."""

    return (
        get_storage_client()
        .storage
        .from_(get_storage_bucket())
        .remove([object_path])
    )
