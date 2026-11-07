
import uuid
from pathlib import Path
from urllib.parse import quote

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form
)

from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.document import Document
from app.models.permission import DocumentPermission
from app.models.user import User

from app.security.dependencies import (
    get_current_user,
    require_document_owner
)

from app.services.audit_service import create_audit_log

from app.services.storage_service import (
    upload_file,
    download_file,
    delete_file
)


router = APIRouter(
    prefix="/documents",
    tags=["Documents"]
)


# --------------------------------------------------
# STORAGE CONFIGURATION
# --------------------------------------------------

BACKEND_DIR = Path(__file__).resolve().parents[2]

STORAGE_DIR = (
    BACKEND_DIR / "storage"
).resolve()

MAX_FILE_SIZE = 5 * 1024 * 1024

ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "text/plain": ".txt"
}


# --------------------------------------------------
# FILE VALIDATION
# --------------------------------------------------

def validate_file(file_content, content_type):

    if content_type == "application/pdf":
        return file_content.startswith(b"%PDF-")

    elif content_type == "image/jpeg":
        return file_content.startswith(b"\xff\xd8\xff")

    elif content_type == "image/png":
        return file_content.startswith(
            b"\x89PNG\r\n\x1a\n"
        )

    elif content_type == "text/plain":

        try:
            file_content.decode("utf-8")
            return True

        except UnicodeDecodeError:
            return False

    return False


# --------------------------------------------------
# DOCUMENT ACCESS CHECK
# --------------------------------------------------

def check_document_access(document, current_user, db):

    # Owner always has access.
    if document.owner_id == current_user.id:
        return True

    # Check active permission.
    permission = db.query(DocumentPermission).filter(
        DocumentPermission.document_id == document.id,
        DocumentPermission.user_id == current_user.id,
        DocumentPermission.permission.in_(["read", "edit"]),
        DocumentPermission.revoked_at.is_(None)
    ).first()

    if permission:
        return True

    raise HTTPException(
        status_code=403,
        detail="You do not have permission to access this document"
    )


# --------------------------------------------------
# AUDIT LOGGING HELPER
# --------------------------------------------------

def log_document_event(
    db,
    current_user,
    action,
    outcome,
    document_id=None,
    details=None
):

    create_audit_log(
        db=db,
        actor_id=current_user.id,
        action=action,
        outcome=outcome,
        document_id=document_id,
        details=details
    )

    db.commit()


# --------------------------------------------------
# 1. DOCUMENT UPLOAD API
# DOCUMENT OWNER ONLY
# USES PRIVATE SUPABASE STORAGE
# --------------------------------------------------

@router.post("/upload")
async def upload_document(
    title: str = Form(...),
    description: str = Form(""),
    category: str = Form("General"),
    file: UploadFile = File(...),

    current_user: User = Depends(require_document_owner),

    db: Session = Depends(get_db)
):

    title = title.strip()

    if not title:

        raise HTTPException(
            status_code=400,
            detail="Document title cannot be empty"
        )

    if len(title) > 200:

        raise HTTPException(
            status_code=400,
            detail="Title cannot exceed 200 characters"
        )

    category = category.strip() or "General"

    if len(category) > 100:

        raise HTTPException(
            status_code=400,
            detail="Category cannot exceed 100 characters"
        )

    if len(description) > 5000:

        raise HTTPException(
            status_code=400,
            detail="Description cannot exceed 5000 characters"
        )

    content_type = (
        file.content_type or ""
    ).split(";")[0].strip().lower()

    if content_type not in ALLOWED_TYPES:

        raise HTTPException(
            status_code=400,
            detail="File type not allowed"
        )

    stored_filename = (
        f"{uuid.uuid4()}{ALLOWED_TYPES[content_type]}"
    )

    # Unique object path inside private Supabase bucket.
    object_path = (
        f"{current_user.id}/{stored_filename}"
    )

    uploaded_to_storage = False
    committed = False

    try:

        # Read maximum allowed size plus one byte.
        file_content = await file.read(
            MAX_FILE_SIZE + 1
        )

        if not file_content:

            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty"
            )

        if len(file_content) > MAX_FILE_SIZE:

            raise HTTPException(
                status_code=413,
                detail="File size cannot exceed 5 MB"
            )

        # Validate actual file content.
        if not validate_file(
            file_content,
            content_type
        ):

            raise HTTPException(
                status_code=400,
                detail="File content does not match the selected file type"
            )

        # Upload to private Supabase Storage.
        upload_file(
            object_path,
            file_content,
            content_type
        )

        uploaded_to_storage = True

        # Create database document record.
        new_document = Document(
            title=title,
            description=description,
            category=category,
            original_filename=Path(
                file.filename or "uploaded_file"
            ).name[:255],
            stored_filename=stored_filename,
            storage_path=object_path,
            file_size=len(file_content),
            content_type=content_type,
            owner_id=current_user.id
        )

        db.add(new_document)

        # Generate document ID before audit logging.
        db.flush()

        # Record successful upload.
        create_audit_log(
            db=db,
            actor_id=current_user.id,
            action="DOCUMENT_UPLOAD",
            outcome="SUCCESS",
            document_id=new_document.id,
            details="Document uploaded to private Supabase Storage"
        )

        # Save document and audit entry together.
        db.commit()
        committed = True

        db.refresh(new_document)

        return {
            "message": "Document uploaded successfully",
            "document_id": str(new_document.id),
            "title": new_document.title,
            "original_filename": new_document.original_filename,
            "file_size": new_document.file_size,
            "owner_id": str(new_document.owner_id)
        }

    except Exception:

        if not committed:

            db.rollback()

            # Remove cloud object if database transaction failed.
            if uploaded_to_storage:

                try:
                    delete_file(object_path)

                except Exception:
                    # Preserve the original database error.
                    pass

        raise

    finally:

        await file.close()


# --------------------------------------------------
# 2. DOCUMENT LISTING API
# OWNER AND AUTHORIZED VIEWER
# --------------------------------------------------

@router.get("/")
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    documents = (
        db.query(Document)
        .outerjoin(
            DocumentPermission,
            DocumentPermission.document_id == Document.id
        )
        .filter(
            or_(
                Document.owner_id == current_user.id,

                (
                    (DocumentPermission.user_id == current_user.id)
                    &
                    (DocumentPermission.permission.in_(["read", "edit"]))
                    &
                    (DocumentPermission.revoked_at.is_(None))
                )
            )
        )
        .distinct()
        .order_by(Document.created_at.desc())
        .all()
    )

    return [
        {
            "document_id": str(document.id),
            "title": document.title,
            "description": document.description,
            "category": document.category,
            "original_filename": document.original_filename,
            "file_size": document.file_size,
            "content_type": document.content_type,
            "owner_id": str(document.owner_id),
            "created_at": document.created_at
        }
        for document in documents
    ]


# --------------------------------------------------
# 3. SECURE DOCUMENT DOWNLOAD API
# SUPPORTS SUPABASE AND LEGACY LOCAL FILES
# --------------------------------------------------

@router.get("/{document_id}/download")
def download_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    # Validate document ID.
    try:

        document_uuid = uuid.UUID(document_id)

    except ValueError:

        log_document_event(
            db=db,
            current_user=current_user,
            action="DOCUMENT_DOWNLOAD",
            outcome="DENIED",
            details="Invalid document ID"
        )

        raise HTTPException(
            status_code=400,
            detail="Invalid document ID"
        )

    # Find document.
    document = db.query(Document).filter(
        Document.id == document_uuid
    ).first()

    if document is None:

        log_document_event(
            db=db,
            current_user=current_user,
            action="DOCUMENT_DOWNLOAD",
            outcome="DENIED",
            details="Document not found"
        )

        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    # Check current permission on every request.
    try:

        check_document_access(
            document,
            current_user,
            db
        )

    except HTTPException as error:

        if error.status_code == 403:

            log_document_event(
                db=db,
                current_user=current_user,
                action="DOCUMENT_DOWNLOAD",
                outcome="DENIED",
                document_id=document.id,
                details="Unauthorized download attempt"
            )

        raise

    # Identify new Supabase objects.
    expected_object_path = (
        f"{document.owner_id}/{document.stored_filename}"
    )

    if document.storage_path == expected_object_path:

        # Retrieve document from private Supabase Storage.
        try:

            file_content = download_file(
                document.storage_path
            )

        except Exception:

            log_document_event(
                db=db,
                current_user=current_user,
                action="DOCUMENT_DOWNLOAD",
                outcome="FAILED",
                document_id=document.id,
                details="Supabase document retrieval failed"
            )

            raise HTTPException(
                status_code=502,
                detail="Unable to retrieve document from secure storage"
            )

    else:

        # Backward compatibility for existing local documents.
        try:

            file_path = Path(
                document.storage_path
            ).resolve()

            if not file_path.is_relative_to(
                STORAGE_DIR.resolve()
            ):

                raise HTTPException(
                    status_code=500,
                    detail="Invalid document storage location"
                )

            if not file_path.is_file():

                raise HTTPException(
                    status_code=404,
                    detail="Stored document file not found"
                )

            file_content = file_path.read_bytes()

        except HTTPException:

            log_document_event(
                db=db,
                current_user=current_user,
                action="DOCUMENT_DOWNLOAD",
                outcome="FAILED",
                document_id=document.id,
                details="Local document unavailable or invalid"
            )

            raise

        except OSError:

            log_document_event(
                db=db,
                current_user=current_user,
                action="DOCUMENT_DOWNLOAD",
                outcome="FAILED",
                document_id=document.id,
                details="Local document could not be read"
            )

            raise HTTPException(
                status_code=404,
                detail="Stored document file not found"
            )

    # Record successful authorized download.
    log_document_event(
        db=db,
        current_user=current_user,
        action="DOCUMENT_DOWNLOAD",
        outcome="SUCCESS",
        document_id=document.id,
        details="Authorized document download completed"
    )

    # Return file through authenticated backend.
    return Response(
        content=file_content,
        media_type=document.content_type,
        headers={
            "Content-Disposition": (
                "attachment; filename*=UTF-8''"
                + quote(document.original_filename, safe="")
            ),
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff"
        }
    )
