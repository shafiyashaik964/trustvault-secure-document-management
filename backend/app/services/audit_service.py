import hashlib
import json

from datetime import datetime, timezone

from sqlalchemy.orm import Session
from sqlalchemy import desc, text

from app.models.audit_log import AuditLog


# PostgreSQL advisory lock ID
AUDIT_LOCK_ID = 72419021

# Timestamp used by the older audit implementation
LEGACY_TIMESTAMP = "pending-database-timestamp"


# --------------------------------------------------
# 1. HASH CALCULATION
# --------------------------------------------------

def calculate_entry_hash(audit_data):

    serialized_data = json.dumps(
        audit_data,
        sort_keys=True
    )

    return hashlib.sha256(
        serialized_data.encode()
    ).hexdigest()


# --------------------------------------------------
# 2. CREATE AUDIT LOG
# --------------------------------------------------

def create_audit_log(
    db: Session,
    actor_id,
    action: str,
    outcome: str,
    document_id=None,
    target_user_id=None,
    details=None
):

    # Prevent concurrent transactions from creating
    # audit entries with the same previous hash.
    db.execute(
        text("SELECT pg_advisory_xact_lock(:lock_id)"),
        {"lock_id": AUDIT_LOCK_ID}
    )

    # Get the latest audit record.
    previous_entry = (
        db.query(AuditLog)
        .order_by(
            desc(AuditLog.created_at),
            desc(AuditLog.id)
        )
        .first()
    )

    # Set the previous hash.
    previous_hash = (
        previous_entry.entry_hash
        if previous_entry
        else "GENESIS"
    )

    # Generate current UTC timestamp.
    timestamp = datetime.now(timezone.utc)

    # Prepare audit information.
    audit_data = {
        "actor_id": str(actor_id) if actor_id else None,
        "action": action,
        "outcome": outcome,
        "document_id": str(document_id) if document_id else None,
        "target_user_id": str(target_user_id) if target_user_id else None,
        "details": details,
        "previous_hash": previous_hash,
        "timestamp": timestamp.isoformat()
    }

    # Generate SHA-256 hash.
    entry_hash = calculate_entry_hash(audit_data)

    # Create audit database record.
    audit_entry = AuditLog(
        actor_id=actor_id,
        action=action,
        outcome=outcome,
        document_id=document_id,
        target_user_id=target_user_id,
        details=details,
        previous_hash=previous_hash,
        entry_hash=entry_hash,
        created_at=timestamp
    )

    db.add(audit_entry)

    # Send the record to the database transaction.
    db.flush()

    return audit_entry


# --------------------------------------------------
# 3. VERIFY AUDIT CHAIN
# --------------------------------------------------

def verify_audit_chain(db: Session):

    # Fetch all audit records in chronological order.
    audit_entries = (
        db.query(AuditLog)
        .order_by(
            AuditLog.created_at.asc(),
            AuditLog.id.asc()
        )
        .all()
    )

    expected_previous_hash = "GENESIS"

    legacy_count = 0
    current_count = 0

    # Verify each audit record.
    for entry in audit_entries:

        common_data = {
            "actor_id": str(entry.actor_id) if entry.actor_id else None,
            "action": entry.action,
            "outcome": entry.outcome,
            "document_id": str(entry.document_id) if entry.document_id else None,
            "target_user_id": str(entry.target_user_id) if entry.target_user_id else None,
            "details": entry.details,
            "previous_hash": entry.previous_hash
        }

        # ------------------------------------------
        # Check previous hash connection
        # ------------------------------------------

        if entry.previous_hash != expected_previous_hash:

            return {
                "valid": False,
                "message": "Audit chain link verification failed",
                "failed_entry_id": str(entry.id)
            }

        # ------------------------------------------
        # Check legacy hashing algorithm
        # ------------------------------------------

        legacy_data = {
            **common_data,
            "timestamp": LEGACY_TIMESTAMP
        }

        legacy_serialized = json.dumps(
            legacy_data,
            sort_keys=True
        )

        legacy_hash = hashlib.sha256(
            legacy_serialized.encode()
        ).hexdigest()

        if legacy_hash == entry.entry_hash:

            legacy_count += 1

        else:

            # --------------------------------------
            # Check current timestamp-based hashing
            # --------------------------------------

            timestamp = entry.created_at

            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(
                    tzinfo=timezone.utc
                )

            current_data = {
                **common_data,
                "timestamp": timestamp.isoformat()
            }

            current_hash = calculate_entry_hash(
                current_data
            )

            if current_hash != entry.entry_hash:

                return {
                    "valid": False,
                    "message": "Audit entry hash verification failed",
                    "failed_entry_id": str(entry.id)
                }

            current_count += 1

        # Update expected previous hash.
        expected_previous_hash = entry.entry_hash

    # All records successfully verified.
    return {
        "valid": True,
        "message": "Audit chain verified successfully",
        "total_entries": len(audit_entries),
        "legacy_entries": legacy_count,
        "current_entries": current_count
    }