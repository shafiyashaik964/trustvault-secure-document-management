import uuid

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.security.token import verify_access_token


# HTTP Bearer authentication
security_scheme = HTTPBearer(auto_error=False)


# ==========================================
# GET CURRENT AUTHENTICATED USER
# ==========================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db)
):
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:
        payload = verify_access_token(credentials.credentials)
        user_id = uuid.UUID(payload["sub"])

    except (ValueError, TypeError, KeyError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User account not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is inactive"
        )

    return user


# ==========================================
# ADMIN-ONLY ACCESS
# ==========================================

def require_admin(
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return current_user


# ==========================================
# DOCUMENT OWNER-ONLY ACCESS
# ==========================================

def require_document_owner(
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "document_owner":
        raise HTTPException(
            status_code=403,
            detail="Only document owners can perform this action"
        )

    return current_user