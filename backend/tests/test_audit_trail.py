import uuid

from app.models.user import User
from app.models.document import Document
from app.models.audit_log import AuditLog

from app.services.audit_service import (
    create_audit_log,
    verify_audit_chain
)


# --------------------------------------------------
# HELPER: CREATE TEST USER
# --------------------------------------------------

def create_test_user(db):

    user = User(
        id=uuid.uuid4(),
        full_name="Audit Test User",
        email=f"audit-{uuid.uuid4()}@example.com",
        password_hash="test-password-hash",
        role="document_owner",
        is_active=True
    )

    db.add(user)
    db.flush()

    return user


# --------------------------------------------------
# HELPER: CREATE TEST DOCUMENT
# --------------------------------------------------

def create_test_document(db, owner):

    document = Document(
        id=uuid.uuid4(),
        title="Audit Test Document",
        description="Document for audit testing",
        category="Testing",
        original_filename="audit_test.txt",
        stored_filename=f"{uuid.uuid4()}.txt",
        storage_path="test_storage/audit_test.txt",
        file_size=100,
        content_type="text/plain",
        owner_id=owner.id
    )

    db.add(document)
    db.flush()

    return document


# --------------------------------------------------
# TEST 1: SUCCESSFUL ACCESS IS RECORDED
# --------------------------------------------------

def test_successful_access_is_recorded(client, db):

    user = create_test_user(db)

    document = create_test_document(
        db,
        user
    )

    audit_entry = create_audit_log(
        db=db,
        actor_id=user.id,
        action="DOCUMENT_DOWNLOAD",
        outcome="SUCCESS",
        document_id=document.id,
        details="Document downloaded successfully"
    )

    db.flush()

    saved_entry = db.query(AuditLog).filter(
        AuditLog.id == audit_entry.id
    ).first()

    assert saved_entry is not None
    assert saved_entry.actor_id == user.id
    assert saved_entry.document_id == document.id
    assert saved_entry.action == "DOCUMENT_DOWNLOAD"
    assert saved_entry.outcome == "SUCCESS"
    assert saved_entry.entry_hash is not None


# --------------------------------------------------
# TEST 2: DENIED ACCESS IS RECORDED
# --------------------------------------------------

def test_denied_access_is_recorded(client, db):

    user = create_test_user(db)

    document = create_test_document(
        db,
        user
    )

    audit_entry = create_audit_log(
        db=db,
        actor_id=user.id,
        action="DOCUMENT_DOWNLOAD",
        outcome="DENIED",
        document_id=document.id,
        details="Unauthorized document access attempt"
    )

    db.flush()

    saved_entry = db.query(AuditLog).filter(
        AuditLog.id == audit_entry.id
    ).first()

    assert saved_entry is not None
    assert saved_entry.actor_id == user.id
    assert saved_entry.document_id == document.id
    assert saved_entry.outcome == "DENIED"
    assert saved_entry.details == (
        "Unauthorized document access attempt"
    )


# --------------------------------------------------
# TEST 3: AUDIT HASH CHAIN IS VALID
# --------------------------------------------------

def test_audit_chain_verification(db):

    user = create_test_user(db)

    document = create_test_document(
        db,
        user
    )

    create_audit_log(
        db=db,
        actor_id=user.id,
        action="DOCUMENT_DOWNLOAD",
        outcome="SUCCESS",
        document_id=document.id,
        details="Successful access"
    )

    create_audit_log(
        db=db,
        actor_id=user.id,
        action="DOCUMENT_DOWNLOAD",
        outcome="DENIED",
        document_id=document.id,
        details="Denied access"
    )

    db.flush()

    result = verify_audit_chain(db)

    assert result["valid"] is True
    assert result["total_entries"] >= 2


# --------------------------------------------------
# TEST 4: TAMPERED AUDIT ENTRY IS DETECTED
# --------------------------------------------------

def test_tampered_audit_entry_is_detected(db):

    user = create_test_user(db)

    document = create_test_document(
        db,
        user
    )

    audit_entry = create_audit_log(
        db=db,
        actor_id=user.id,
        action="DOCUMENT_DOWNLOAD",
        outcome="SUCCESS",
        document_id=document.id,
        details="Original audit details"
    )

    db.flush()

    # Simulate unauthorized modification.
    audit_entry.details = "Modified audit details"

    db.flush()

    result = verify_audit_chain(db)

    assert result["valid"] is False
    assert result["message"] == (
        "Audit entry hash verification failed"
    )