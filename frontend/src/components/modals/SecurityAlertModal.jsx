import React from "react";
import "./SecurityAlertModal.css";

function SecurityAlertModal({ alert, onClose }) {
  if (!alert) return null;

  const title = alert.title || "Security Alert";
  const message =
    alert.message || alert.description || "No additional details available.";

  const severity = (alert.severity || alert.level || "info").toLowerCase();

  return (
    <div className="tv-modal-overlay" onClick={onClose}>
      <div
        className={`tv-security-modal severity-${severity}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="tv-security-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="tv-security-icon">!</div>

        <span className="tv-security-label">TRUSTVAULT SECURITY</span>

        <h2>{title}</h2>

        <p className="tv-security-message">{message}</p>

        <div className="tv-security-info">
          <div>
            <span>Severity</span>
            <strong>{severity.toUpperCase()}</strong>
          </div>

          <div>
            <span>Date & Time</span>
            <strong>
              {alert.created_at || alert.timestamp || "Not available"}
            </strong>
          </div>
        </div>

        <button className="tv-security-button" onClick={onClose}>
          Close Alert
        </button>
      </div>
    </div>
  );
}

export default SecurityAlertModal;