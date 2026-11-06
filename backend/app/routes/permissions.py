import uuid

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.document import Document
from app.models.permission import DocumentPermission
from app.models.user import User

from app.security.dependencies import get_current_user
from app.schemas.permission import PermissionCreate
from app.services.audit_service import create_audit_log


router = APIRouter(
    prefix="/permissions",
    tags=["Document Permissions"]
)
# ==========================================
# GET ALL DOCUMENT PERMISSIONS (ADMIN)
# ==========================================

@router.get("/")
def get_all_permissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    # Only administrators can view all permissions
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only administrators can view all permissions"
        )

    permissions = db.query(
        DocumentPermission
    ).all()

    result = []

    for permission in permissions:

        recipient = db.query(User).filter(
            User.id == permission.user_id
        ).first()

        result.append({
            "document_id": str(permission.document_id),
            "user_id": str(permission.user_id),
            "user_name": recipient.full_name if recipient else "Unknown User",
            "user_email": recipient.email if recipient else "Unknown",
            "permission": permission.permission,
            "granted_by": str(permission.granted_by),
            "created_at": permission.created_at.isoformat()
                if permission.created_at else None,
            "revoked_at": permission.revoked_at.isoformat()
                if permission.revoked_at else None,
            "status": (
                "Revoked"
                if permission.revoked_at
                else "Active"
            )
        })

    return {
        "total_permissions": len(result),
        "permissions": result
    }
# ==========================================
# GET DOCUMENT OWNER PERMISSIONS
# ==========================================

@router.get("/owner")
def get_owner_permissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only document owners can access this endpoint
    if current_user.role != "document_owner":
        raise HTTPException(
            status_code=403,
            detail="Only document owners can view their permissions"
        )

    # Get permissions only for documents owned by this user
    records = (
        db.query(DocumentPermission, Document, User)
        .join(
            Document,
            DocumentPermission.document_id == Document.id
        )
        .join(
            User,
            DocumentPermission.user_id == User.id
        )
        .filter(Document.owner_id == current_user.id)
        .order_by(DocumentPermission.created_at.desc())
        .all()
    )

    result = []

    for permission, document, recipient in records:
        result.append({
            "document_id": str(document.id),
            "document_title": document.title,
            "user_id": str(recipient.id),
            "user_name": recipient.full_name,
            "user_email": recipient.email,
            "permission": permission.permission,
            "created_at": (
                permission.created_at.isoformat()
                if permission.created_at else None
            ),
            "revoked_at": (
                permission.revoked_at.isoformat()
                if permission.revoked_at else None
            ),
            "status": (
                "Revoked"
                if permission.revoked_at
                else "Active"
            )
        })

    return {
        "total_permissions": len(result),
        "permissions": result
    }
# ==========================================
# AUDIT LOGGING HELPER
# ==========================================

def log_permission_event(
    db,
    current_user,
    action,
    outcome,
    document_id=None,
    target_user_id=None,
    details=None
):

    create_audit_log(
        db=db,
        actor_id=current_user.id,
        action=action,
        outcome=outcome,
        document_id=document_id,
        target_user_id=target_user_id,
        details=details
    )

    db.commit()


# ==========================================
# CHECK DOCUMENT OWNER
# ==========================================

def check_document_owner(
    document,
    current_user,
    db,
    action
):

    # Check global role
    if current_user.role != "document_owner":

        log_permission_event(
            db=db,
            current_user=current_user,
            action=action,
            outcome="DENIED",
            document_id=document.id,
            details="User does not have document_owner role"
        )

        raise HTTPException(
            status_code=403,
            detail="Only document owners can manage permissions"
        )

    # Check actual document ownership
    if document.owner_id != current_user.id:

        log_permission_event(
            db=db,
            current_user=current_user,
            action=action,
            outcome="DENIED",
            document_id=document.id,
            details="User does not own this document"
        )

        raise HTTPException(
            status_code=403,
            detail="You are not the owner of this document"
        )


# ==========================================
# GRANT DOCUMENT PERMISSION
# ==========================================

@router.post("/{document_id}/grant")
def grant_permission(
    document_id: str,
    permission_data: PermissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    # Validate document ID
    try:

        document_uuid = uuid.UUID(document_id)

    except ValueError:

        log_permission_event(
            db=db,
            current_user=current_user,
            action="PERMISSION_GRANT",
            outcome="DENIED",
            details="Invalid document ID"
        )

        raise HTTPException(
            status_code=400,
            detail="Invalid document ID"
        )

    # Find document
    document = db.query(Document).filter(
        Document.id == document_uuid
    ).first()

    if document is None:

        log_permission_event(
            db=db,
            current_user=current_user,
            action="PERMISSION_GRANT",
            outcome="DENIED",
            details="Document not found"
        )

        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    # Check owner role and ownership
    check_document_owner(
        document,
        current_user,
        db,
        "PERMISSION_GRANT"
    )

    # Validate permission type
    if permission_data.permission not in ["read", "edit"]:

        log_permission_event(
            db=db,
            current_user=current_user,
            action="PERMISSION_GRANT",
            outcome="DENIED",
            document_id=document_uuid,
            details="Invalid permission type"
        )

        raise HTTPException(
            status_code=400,
            detail="Permission must be read or edit"
        )

    # Find recipient
    recipient_email = str(
        permission_data.user_email
    ).strip().lower()

    target_user = db.query(User).filter(
        User.email == recipient_email
    ).first()

    if target_user is None or not target_user.is_active:

        log_permission_event(
            db=db,
            current_user=current_user,
            action="PERMISSION_GRANT",
            outcome="DENIED",
            document_id=document_uuid,
            details="Recipient not found or inactive"
        )

        raise HTTPException(
            status_code=404,
            detail="Active recipient user not found"
        )

    # Prevent sharing with yourself
    if target_user.id == current_user.id:

        log_permission_event(
            db=db,
            current_user=current_user,
            action="PERMISSION_GRANT",
            outcome="DENIED",
            document_id=document_uuid,
            target_user_id=target_user.id,
            details="Attempted self-sharing"
        )

        raise HTTPException(
            status_code=400,
            detail="Cannot share document with yourself"
        )

    try:

        # Check existing permission
        existing_permission = db.query(
            DocumentPermission
        ).filter(
            DocumentPermission.document_id == document_uuid,
            DocumentPermission.user_id == target_user.id
        ).first()

        if existing_permission:

            existing_permission.permission = (
                permission_data.permission
            )

            existing_permission.granted_by = current_user.id

            # Reactivate previously revoked permission
            existing_permission.revoked_at = None

            action = "PERMISSION_UPDATED"

        else:

            existing_permission = DocumentPermission(
                document_id=document_uuid,
                user_id=target_user.id,
                permission=permission_data.permission,
                granted_by=current_user.id
            )

            db.add(existing_permission)

            action = "PERMISSION_GRANTED"

        # Record audit event
        create_audit_log(
            db=db,
            actor_id=current_user.id,
            action=action,
            outcome="SUCCESS",
            document_id=document_uuid,
            target_user_id=target_user.id,
            details=(
                f"Permission set to "
                f"{permission_data.permission}"
            )
        )

        db.commit()

        db.refresh(existing_permission)

        return {
            "message": "Permission granted successfully",
            "document_id": str(document_uuid),
            "user_id": str(target_user.id),
            "user_email": target_user.email,
            "permission": existing_permission.permission,
            "created_at": existing_permission.created_at
        }

    except Exception:

        db.rollback()
        raise


# ==========================================
# REVOKE DOCUMENT PERMISSION
# ==========================================

@router.delete("/{document_id}/revoke/{user_id}")
def revoke_permission(
    document_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    # Validate IDs
    try:

        document_uuid = uuid.UUID(document_id)
        user_uuid = uuid.UUID(user_id)

    except ValueError:

        log_permission_event(
            db=db,
            current_user=current_user,
            action="PERMISSION_REVOKE",
            outcome="DENIED",
            details="Invalid document or user ID"
        )

        raise HTTPException(
            status_code=400,
            detail="Invalid ID"
        )

    # Find document
    document = db.query(Document).filter(
        Document.id == document_uuid
    ).first()

    if document is None:

        log_permission_event(
            db=db,
            current_user=current_user,
            action="PERMISSION_REVOKE",
            outcome="DENIED",
            details="Document not found"
        )

        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    # Check role and ownership
    check_document_owner(
        document,
        current_user,
        db,
        "PERMISSION_REVOKE"
    )

    # Find recipient
    target_user = db.query(User).filter(
        User.id == user_uuid
    ).first()

    if target_user is None:

        log_permission_event(
            db=db,
            current_user=current_user,
            action="PERMISSION_REVOKE",
            outcome="DENIED",
            document_id=document_uuid,
            details="Recipient user not found"
        )

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Find active permission
    permission = db.query(
        DocumentPermission
    ).filter(
        DocumentPermission.document_id == document_uuid,
        DocumentPermission.user_id == user_uuid,
        DocumentPermission.revoked_at.is_(None)
    ).first()

    if permission is None:

        log_permission_event(
            db=db,
            current_user=current_user,
            action="PERMISSION_REVOKE",
            outcome="DENIED",
            document_id=document_uuid,
            target_user_id=user_uuid,
            details="Active permission not found"
        )

        raise HTTPException(
            status_code=404,
            detail="Active permission not found"
        )

    try:

        # Revoke access immediately
        permission.revoked_at = datetime.now(
            timezone.utc
        )

        # Record audit event
        create_audit_log(
            db=db,
            actor_id=current_user.id,
            action="PERMISSION_REVOKED",
            outcome="SUCCESS",
            document_id=document_uuid,
            target_user_id=user_uuid,
            details="Document permission revoked"
        )

        db.commit()

        return {
            "message": "Permission revoked successfully",
            "document_id": str(document_uuid),
            "user_id": str(user_uuid)
        }

    except Exception:

        db.rollback()
        raise