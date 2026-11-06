
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.document import Document
from app.schemas.audit import AuditLogResponse
from app.security.dependencies import (
    require_admin,
    require_document_owner,
    get_current_user
)
from app.services.audit_service import verify_audit_chain


# ==========================================
# ADMIN AUDIT ROUTER
# ==========================================

router = APIRouter(
    prefix="/admin/audit",
    tags=["Admin Audit"]
)


@router.get("/", response_model=list[AuditLogResponse])
def get_audit_logs(
    action: str | None = Query(default=None),
    outcome: str | None = Query(default=None),
    actor_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action.upper())

    if outcome:
        query = query.filter(AuditLog.outcome == outcome.upper())

    if actor_id:
        query = query.filter(AuditLog.actor_id == actor_id)

    logs = (
        query
        .order_by(desc(AuditLog.created_at), desc(AuditLog.id))
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [
        {
            "id": str(log.id),
            "actor_id": str(log.actor_id) if log.actor_id else None,
            "action": log.action,
            "document_id": str(log.document_id) if log.document_id else None,
            "target_user_id": str(log.target_user_id) if log.target_user_id else None,
            "outcome": log.outcome,
            "details": log.details,
            "previous_hash": log.previous_hash,
            "entry_hash": log.entry_hash,
            "created_at": log.created_at
        }
        for log in logs
    ]


@router.get("/verify")
def verify_audit_logs(
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    return verify_audit_chain(db)


# ==========================================
# DOCUMENT OWNER AUDIT ROUTER
# ==========================================

owner_router = APIRouter(
    prefix="/owner/audit",
    tags=["Document Owner Audit"]
)


@owner_router.get("/")
def get_owner_audit_logs(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    owner=Depends(require_document_owner)
):
    logs = (
        db.query(AuditLog, Document.title)
        .join(Document, AuditLog.document_id == Document.id)
        .filter(Document.owner_id == owner.id)
        .order_by(desc(AuditLog.created_at), desc(AuditLog.id))
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [
        {
            "id": str(log.id),
            "actor_id": str(log.actor_id) if log.actor_id else None,
            "action": log.action,
            "document_id": str(log.document_id),
            "document_title": document_title,
            "target_user_id": (
                str(log.target_user_id)
                if log.target_user_id else None
            ),
            "outcome": log.outcome,
            "details": log.details,
            "created_at": log.created_at
        }
        for log, document_title in logs
    ]


# ==========================================
# VIEWER AUDIT ROUTER
# ==========================================

viewer_router = APIRouter(
    prefix="/viewer/audit",
    tags=["Viewer Audit"]
)


@viewer_router.get("/")
def get_viewer_audit_logs(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    viewer=Depends(get_current_user)
):
    # Only Viewer accounts can access this endpoint.
    if viewer.role != "viewer":
        raise HTTPException(
            status_code=403,
            detail="Only viewers can access this audit history"
        )

    # Show events performed by this Viewer or events
    # where this Viewer was the recipient.
    logs = (
        db.query(AuditLog, Document.title)
        .outerjoin(
            Document,
            AuditLog.document_id == Document.id
        )
        .filter(
            or_(
                AuditLog.actor_id == viewer.id,
                AuditLog.target_user_id == viewer.id
            )
        )
        .order_by(
            desc(AuditLog.created_at),
            desc(AuditLog.id)
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [
        {
            "id": str(log.id),
            "action": log.action,
            "document_id": (
                str(log.document_id)
                if log.document_id else None
            ),
            "document_title": document_title,
            "outcome": log.outcome,
            "details": log.details,
            "created_at": log.created_at
        }
        for log, document_title in logs
    ]
