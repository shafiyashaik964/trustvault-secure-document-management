import uuid

from app.main import app
from app.models.user import User
from app.security.dependencies import get_current_user


# Create temporary test users without saving them to the database
def create_test_user(role):
    return User(
        id=uuid.uuid4(),
        full_name="Test User",
        email=f"{role}-{uuid.uuid4()}@example.com",
        password_hash="test-password-hash",
        role=role,
        is_active=True
    )


# Test application health
def test_health_check(client):
    response = client.get("/health")

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "healthy"
    assert data["application"] == "TrustVault"


# Test audit logs without authentication
def test_admin_audit_requires_authentication(client):
    response = client.get("/admin/audit/")

    assert response.status_code == 401


# Test audit verification without authentication
def test_audit_verification_requires_authentication(client):
    response = client.get("/admin/audit/verify")

    assert response.status_code == 401


# Test admin can access audit logs
def test_admin_can_view_audit_logs(client):
    admin_user = create_test_user("admin")

    app.dependency_overrides[get_current_user] = lambda: admin_user

    try:
        response = client.get("/admin/audit/")

        assert response.status_code == 200
        assert isinstance(response.json(), list)

    finally:
        app.dependency_overrides.pop(get_current_user, None)


# Test viewer cannot access admin audit logs
def test_viewer_cannot_view_audit_logs(client):
    viewer_user = create_test_user("viewer")

    app.dependency_overrides[get_current_user] = lambda: viewer_user

    try:
        response = client.get("/admin/audit/")

        assert response.status_code == 403

    finally:
        app.dependency_overrides.pop(get_current_user, None)


# Test document owner cannot access admin audit logs
def test_document_owner_cannot_view_audit_logs(client):
    owner_user = create_test_user("document_owner")

    app.dependency_overrides[get_current_user] = lambda: owner_user

    try:
        response = client.get("/admin/audit/")

        assert response.status_code == 403

    finally:
        app.dependency_overrides.pop(get_current_user, None)


# Test admin can verify audit chain
def test_admin_can_verify_audit_chain(client):
    admin_user = create_test_user("admin")

    app.dependency_overrides[get_current_user] = lambda: admin_user

    try:
        response = client.get("/admin/audit/verify")

        assert response.status_code == 200

        data = response.json()

        assert "valid" in data
        assert isinstance(data["valid"], bool)

    finally:
        app.dependency_overrides.pop(get_current_user, None)