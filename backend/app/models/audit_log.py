import uuid

from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    ForeignKey,
    Uuid,
    func
)

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    # Primary key
    id = Column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    # User who performed the action
    actor_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Action performed
    action = Column(
        String(50),
        nullable=False
    )

    # Related document, if applicable
    document_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # User affected by the action, if applicable
    target_user_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    # SUCCESS or DENIED
    outcome = Column(
        String(20),
        nullable=False
    )

    # Additional information about the event
    details = Column(
        Text,
        nullable=True
    )

    # Hash of the previous audit entry
    previous_hash = Column(
        String(64),
        nullable=True
    )

    # Hash of this audit entry
    entry_hash = Column(
        String(64),
        nullable=False,
        unique=True
    )

    # Event timestamp
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )
