from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.user import User
from app.security.dependencies import require_admin


router = APIRouter(
    prefix="/admin",
    tags=["Admin Management"]
)


# ==========================================
# GET ALL REGISTERED USERS
# ==========================================

@router.get("/users")
def get_all_users(
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    users = (
        db.query(User)
        .order_by(desc(User.created_at))
        .all()
    )

    return [
        {
            "id": str(user.id),
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "requested_role": user.requested_role,
            "role_request_status": user.role_request_status,
            "created_at": user.created_at
        }
        for user in users
    ]