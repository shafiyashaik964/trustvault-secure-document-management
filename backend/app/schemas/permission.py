from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Literal


class PermissionCreate(BaseModel):

    user_email: EmailStr

    permission: Literal["read", "edit"]


class PermissionResponse(BaseModel):

    message: str

    document_id: str

    user_id: str

    permission: str

    created_at: datetime