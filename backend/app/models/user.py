import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    String,
    Uuid,
    func
)
from sqlalchemy.orm import mapped_column

from app.database import Base


class User(Base):
    __tablename__ = "users"

    __table_args__ = (
        CheckConstraint(
            "role IN ('admin', 'document_owner', 'viewer')",
            name="check_user_role"
        ),
        CheckConstraint(
            "requested_role IN ('admin', 'document_owner', 'viewer')",
            name="check_requested_role"
        ),
        CheckConstraint(
            "role_request_status IN ('not_required', 'pending', 'approved')",
            name="check_role_request_status"
        ),
    )

    id = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    full_name = mapped_column(
        String(100),
        nullable=False
    )

    email = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )

    password_hash = mapped_column(
        String(255),
        nullable=False
    )

    # Actual role used for authorization
    role = mapped_column(
        String(30),
        default="viewer",
        nullable=False
    )

    # Role requested during registration
    requested_role = mapped_column(
        String(30),
        default="viewer",
        nullable=False
    )

    # Approval status
    role_request_status = mapped_column(
        String(20),
        default="not_required",
        nullable=False
    )

    is_active = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )