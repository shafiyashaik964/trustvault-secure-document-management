from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AuditLogResponse(BaseModel):
    id: str
    actor_id: Optional[str] = None
    action: str
    document_id: Optional[str] = None
    target_user_id: Optional[str] = None
    outcome: str
    details: Optional[str] = None
    previous_hash: Optional[str] = None
    entry_hash: str
    created_at: datetime

    class Config:
        from_attributes = True