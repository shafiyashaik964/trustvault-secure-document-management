import uuid

from app.main import app
from app.models.user import User
from app.models.document import Document
from app.models.permission import DocumentPermission
from app.security.dependencies import get_current_user


# --------------------------------------------------
# HELPER: CREATE TEST USER
# --------------------------------------------------

def create_user(db, role):

    user = User(
        id=uuid.uuid4(),
        full_name=f"Test {role}",
        email=f"{role}-{uuid.uuid4()}@example.com",
        password_hash="test-password-hash",
        role=role,
        is_active=True
    )

    db.add(user)
    db.flush()

    return user


# --------------------------------------------------
# HELPER: CREATE TEST DOCUMENT
# --------------------------------------------------

def create_document(db, owner):

    document = Document(
        id=uuid.uuid4(),
        title="Test Confidential Document",
        description="Temporary integration test document",
        category="Testing",
        original_filename="test_document.txt",
        stored_filename=f"{uuid.uuid4()}.txt",
        storage_path="test_storage/test_document.txt",
        file_size=100,
        content_type="text/plain",
        owner_id=owner.id
    )

    db.add(document)
    db.flush()

    return document


# --------------------------------------------------
# HELPER: AUTHENTICATE TEST USER
# --------------------------------------------------

def authenticate_as(user):

    app.dependency_overrides[get_current_user] = lambda: user


# --------------------------------------------------
# HELPER: CLEAR AUTHENTICATION
# --------------------------------------------------

def clear_authentication():

    app.dependency_overrides.pop(
        get_current_user,
        None
    )


# --------------------------------------------------
# TEST 1: OWNER CAN GRANT READ PERMISSION
# --------------------------------------------------

def test_owner_can_grant_read_permission(client, db):

    owner = create_user(
        db,
        "document_owner"
    )

    viewer = create_user(
        db,
        "viewer"
    )

    document = create_document(
        db,
        owner
    )

    authenticate_as(owner)

    try:

        response = client.post(
            f"/permissions/{document.id}/grant",
            json={
                "user_email": viewer.email,
                "permission": "read"
            }
        )

        assert response.status_code == 200

        data = response.json()

        assert data["permission"] == "read"
        assert data["user_email"] == viewer.email

        permission = db.query(
            DocumentPermission
        ).filter(
            DocumentPermission.document_id == document.id,
            DocumentPermission.user_id == viewer.id
        ).first()

        assert permission is not None
        assert permission.permission == "read"
        assert permission.revoked_at is None

    finally:

        clear_authentication()


# --------------------------------------------------
# TEST 2: VIEWER CANNOT GRANT PERMISSION
# --------------------------------------------------

def test_viewer_cannot_grant_permission(client, db):

    owner = create_user(
        db,
        "document_owner"
    )

    viewer = create_user(
        db,
        "viewer"
    )

    another_viewer = create_user(
        db,
        "viewer"
    )

    document = create_document(
        db,
        owner
    )

    authenticate_as(viewer)

    try:

        response = client.post(
            f"/permissions/{document.id}/grant",
            json={
                "user_email": another_viewer.email,
                "permission": "read"
            }
        )

        assert response.status_code == 403

    finally:

        clear_authentication()


# --------------------------------------------------
# TEST 3: OWNER CAN REVOKE PERMISSION
# --------------------------------------------------

def test_owner_can_revoke_permission(client, db):

    owner = create_user(
        db,
        "document_owner"
    )

    viewer = create_user(
        db,
        "viewer"
    )

    document = create_document(
        db,
        owner
    )

    permission = DocumentPermission(
        id=uuid.uuid4(),
        document_id=document.id,
        user_id=viewer.id,
        permission="read",
        granted_by=owner.id
    )

    db.add(permission)
    db.flush()

    authenticate_as(owner)

    try:

        response = client.delete(
            f"/permissions/{document.id}/revoke/{viewer.id}"
        )

        assert response.status_code == 200

        # Refresh permission from the database
        db.refresh(permission)

        # Verify that permission was revoked
        assert permission.revoked_at is not None

    finally:

        clear_authentication()