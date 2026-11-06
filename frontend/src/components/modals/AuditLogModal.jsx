import React from "react";
import "./AuditLogModal.css";

function getValue(object, keys, fallback = "Not available") {
  for (const key of keys) {
    if (object?.[key] !== undefined && object[key] !== null && object[key] !== "") {
      return object[key];
    }
  }
  return fallback;
}

function AuditLogModal({ log, onClose }) {
  if (!log) return null;

  const details = [
    {
      label: "Action",
      value: getValue(log, ["action", "event_type", "type"]),
    },
    {
      label: "User",
      value: getValue(log, ["user_email", "actor_email", "user"]),
    },
    {
      label: "Document",
      value: getValue(log, ["document_name", "document_id"]),
    },
    {
      label: "Date & Time",
      value: getValue(log, ["created_at", "timestamp"]),
    },
    {
      label: "Status",
      value: getValue(log, ["status", "outcome"]),
    },
    {
      label: "Description",
      value: getValue(log, ["description", "details", "reason"]),
    },
    {
      label: "Record Hash",
      value: getValue(log, ["record_hash", "hash"]),
    },
    {
      label: "Previous Hash",
      value: getValue(log, ["previous_hash"]),
    },
  ];

  return (
    <div className="tv-modal-overlay" onClick={onClose}>
      <div
        className="tv-audit-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="tv-modal-header">
          <div>
            <span className="tv-modal-eyebrow">SECURITY RECORD</span>
            <h2>Audit Log Details</h2>
            <p>Review the details of this activity record.</p>
          </div>

          <button
            className="tv-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="tv-audit-details">
          {details.map((item) => (
            <div className="tv-audit-detail" key={item.label}>
              <span>{item.label}</span>
              <strong>{String(item.value)}</strong>
            </div>
          ))}
        </div>

        <div className="tv-audit-footer">
          <span>TrustVault Security Audit</span>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default AuditLogModal;