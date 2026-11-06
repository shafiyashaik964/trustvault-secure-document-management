import uuid

from app.main import app
from app.models.user import User
from app.models.document import Document
from app.models.permission import DocumentPermission
from app.security.dependencies import get_current_user
from app.routes import documents as documents_route


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


def create_document(db, owner, storage_path):
    document = Document(
        id=uuid.uuid4(),
        title="Confidential Test Document",
        description="Document used for security testing",
        category="Testing",
        original_filename="confidential.txt",
        stored_filename=f"{uuid.uuid4()}.txt",
        storage_path=str(storage_path),
        file_size=25,
        content_type="text/plain",
        owner_id=owner.id
    )

    db.add(document)
    db.flush()

    return document


def authenticate_as(user):
    app.dependency_overrides[get_current_user] = lambda: user


def clear_authentication():
    app.dependency_overrides.pop(get_current_user, None)


def test_viewer_with_permission_can_download(
    client,
    db,
    tmp_path,
    monkeypatch
):
    owner = create_user(db, "document_owner")
    viewer = create_user(db, "viewer")

    monkeypatch.setattr(
        documents_route,
        "STORAGE_DIR",
        tmp_path
    )

    file_path = tmp_path / "confidential.txt"
    file_content = b"This is a confidential test document."

    file_path.write_bytes(file_content)

    document = create_document(
        db,
        owner,
        file_path
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

    authenticate_as(viewer)

    try:
        response = client.get(
            f"/documents/{document.id}/download"
        )

        assert response.status_code == 200
        assert response.content == file_content

    finally:
        clear_authentication()


def test_viewer_without_permission_cannot_download(
    client,
    db,
    tmp_path,
    monkeypatch
):
    owner = create_user(db, "document_owner")
    viewer = create_user(db, "viewer")

    monkeypatch.setattr(
        documents_route,
        "STORAGE_DIR",
        tmp_path
    )

    file_path = tmp_path / "private_document.txt"
    file_path.write_text(
        "Private document content",
        encoding="utf-8"
    )

    document = create_document(
        db,
        owner,
        file_path
    )

    authenticate_as(viewer)

    try:
        response = client.get(
            f"/documents/{document.id}/download"
        )

        assert response.status_code == 403

        assert response.json()["detail"] == (
            "You do not have permission to access this document"
        )

    finally:
        clear_authentication()
def test_revoked_viewer_cannot_download(
    client,
    db,
    tmp_path,
    monkeypatch
):
    owner = create_user(db, "document_owner")
    viewer = create_user(db, "viewer")

    monkeypatch.setattr(
        documents_route,
        "STORAGE_DIR",
        tmp_path
    )

    file_path = tmp_path / "revocation_test.txt"
    file_content = b"Confidential document for revocation testing."
    file_path.write_bytes(file_content)

    document = create_document(
        db,
        owner,
        file_path
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

    authenticate_as(viewer)

    try:
        first_response = client.get(
            f"/documents/{document.id}/download"
        )

        assert first_response.status_code == 200

        permission.revoked_at = __import__(
            "datetime"
        ).datetime.now(
            __import__("datetime").timezone.utc
        )

        db.flush()

        second_response = client.get(
            f"/documents/{document.id}/download"
        )

        assert second_response.status_code == 403

    finally:
        clear_authentication()