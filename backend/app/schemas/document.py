from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional


class DocumentResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    original_filename: str
    file_size: int
    content_type: str
    owner_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=200
    )
    description: Optional[str] = None
    category: Optional[str] = None