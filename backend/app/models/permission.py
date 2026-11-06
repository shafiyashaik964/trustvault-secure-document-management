import uuid

from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    Uuid,
    CheckConstraint,
    UniqueConstraint,
    func
)

from app.database import Base


class DocumentPermission(Base):
    __tablename__ = "document_permissions"

    __table_args__ = (
        CheckConstraint(
            "permission IN ('read', 'edit')",
            name="check_permission_type"
        ),
        UniqueConstraint(
            "document_id",
            "user_id",
            name="unique_document_user_permission"
        ),
    )

    # Primary key
    id = Column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    # Document receiving permission
    document_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # User receiving permission
    user_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Permission type: read or edit
    permission = Column(
        String(10),
        nullable=False
    )

    # User granting permission
    granted_by = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False
    )

    # Permission creation time
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Null means permission is active
    revoked_at = Column(
        DateTime(timezone=True),
        nullable=True
    )
