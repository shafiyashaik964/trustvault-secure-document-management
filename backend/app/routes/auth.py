
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.user import User

from app.schemas.auth import (
    UserRegister,
    UserLogin,
    UserResponse,
    UserRegistrationResponse,
    TokenResponse
)

from app.security.password import hash_password, verify_password
from app.security.token import create_access_token

from app.security.dependencies import get_current_user, require_admin


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# ==========================================
# USER REGISTRATION
# ==========================================

@router.post(
    "/register",
    response_model=UserRegistrationResponse,
    status_code=status.HTTP_201_CREATED
)
def register_user(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):

    email = str(user_data.email).strip().lower()

    existing_user = db.query(User).filter(
        User.email == email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email is already registered"
        )

    requested_role = user_data.requested_role

    allowed_roles = ["viewer", "document_owner"]

    if requested_role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail="Administrator registration is not allowed"
        )

    actual_role = "viewer"

    request_status = (
        "not_required"
        if requested_role == "viewer"
        else "pending"
    )

    new_user = User(
        full_name=user_data.full_name.strip(),
        email=email,
        password_hash=hash_password(user_data.password),
        role=actual_role,
        requested_role=requested_role,
        role_request_status=request_status,
        is_active=True
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="Email is already registered"
        )

    return UserRegistrationResponse(
        id=str(new_user.id),
        full_name=new_user.full_name,
        email=new_user.email,
        role=new_user.role,
        is_active=new_user.is_active,
        requested_role=new_user.requested_role,
        role_request_status=new_user.role_request_status
    )


# ==========================================
# USER LOGIN
# ==========================================

@router.post(
    "/login",
    response_model=TokenResponse
)
def login_user(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):

    email = str(login_data.email).strip().lower()

    user = db.query(User).filter(
        User.email == email
    ).first()

    if user is None or not verify_password(
        login_data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is inactive"
        )

    access_token = create_access_token(
        user_id=str(user.id),
        role=user.role
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer"
    )


# ==========================================
# CURRENT USER PROFILE
# ==========================================

@router.get(
    "/me",
    response_model=UserResponse
)
def get_my_profile(
    current_user: User = Depends(get_current_user)
):

    return UserResponse(
        id=str(current_user.id),
        full_name=current_user.full_name,
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active
    )


# ==========================================
# ADMIN: VIEW PENDING ROLE REQUESTS
# ==========================================

@router.get("/role-requests")
def get_role_requests(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):

    users = db.query(User).filter(
        User.role_request_status == "pending",
        User.requested_role == "document_owner"
    ).all()

    return [
        {
            "user_id": str(user.id),
            "full_name": user.full_name,
            "email": user.email,
            "current_role": user.role,
            "requested_role": user.requested_role,
            "status": user.role_request_status
        }
        for user in users
    ]


# ==========================================
# ADMIN: APPROVE ROLE REQUEST
# ==========================================

@router.post("/role-requests/{user_id}/approve")
def approve_role_request(
    user_id: UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if user.role_request_status != "pending":
        raise HTTPException(
            status_code=400,
            detail="No pending role request"
        )

    if user.requested_role != "document_owner":
        raise HTTPException(
            status_code=403,
            detail="This role cannot be approved through public registration"
        )

    user.role = "document_owner"
    user.role_request_status = "approved"

    db.commit()
    db.refresh(user)

    return {
        "message": "Role request approved successfully",
        "user_id": str(user.id),
        "email": user.email,
        "role": user.role
    }


# ==========================================
# ADMIN-ONLY TEST ENDPOINT
# ==========================================

@router.get("/admin-check")
def admin_check(
    current_user: User = Depends(require_admin)
):

    return {
        "message": "Admin access granted",
        "admin_name": current_user.full_name,
        "role": current_user.role
    }


# ==========================================
# ADMIN: VIEW ALL REGISTERED USERS
# ==========================================

@router.get("/users")
def get_all_users(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):

    users = db.query(User).order_by(
        User.full_name.asc()
    ).all()

    return [
        {
            "id": str(user.id),
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "requested_role": user.requested_role,
            "role_request_status": user.role_request_status
        }
        for user in users
    ]
