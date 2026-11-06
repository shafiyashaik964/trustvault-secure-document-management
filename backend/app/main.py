
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

# Database imports
from app.database import test_database_connection, engine, Base

# Model imports
from app import models

# Router imports
from app.routes.auth import router as auth_router
from app.routes.documents import router as documents_router
from app.routes.permissions import router as permissions_router
from app.routes.audit import router as audit_router
from app.routes.audit import owner_router as owner_audit_router
from app.routes.audit import viewer_router as viewer_audit_router


app = FastAPI(
    title="TrustVault API",
    description=(
        "Secure document sharing with "
        "authentication, access control, "
        "and a tamper-evident audit trail."
    ),
    version="0.3.0"
)


# CORS Configuration
# Add your deployed Vercel frontend URL to TRUSTVAULT_CORS_ORIGINS.
cors_origins = os.getenv(
    "TRUSTVAULT_CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
)

allowed_origins = [
    origin.strip().rstrip("/")
    for origin in cors_origins.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create database tables during startup
@app.on_event("startup")
def create_database_tables():
    Base.metadata.create_all(bind=engine)


# Register API routers
app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(permissions_router)
app.include_router(audit_router)
app.include_router(owner_audit_router)
app.include_router(viewer_audit_router)


# Root endpoint
@app.get("/")
def root():
    return {
        "message": "TrustVault API is running",
        "version": "0.3.0",
        "modules": [
            "Authentication",
            "Document Management",
            "Document Permissions",
            "Audit Trail",
            "Admin Audit Dashboard",
            "Document Owner Audit Dashboard"
        ]
    }


# Application health check
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "application": "TrustVault"
    }


# Database health check
@app.get("/db-health")
def database_health():
    try:
        result = test_database_connection()

        if result == 1:
            return {
                "database": "connected",
                "status": "healthy"
            }

        raise HTTPException(
            status_code=503,
            detail="Database connection test failed"
        )

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Database connection failed"
        )
