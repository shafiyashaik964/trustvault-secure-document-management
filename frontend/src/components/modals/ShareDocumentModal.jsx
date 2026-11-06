import { useState } from "react";
import "./ShareDocumentModal.css";

function ShareDocumentModal({
  document,
  onClose,
  onShare,
  loading = false
}) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("read");
  const [error, setError] = useState("");

  if (!document) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();

    const recipient = email.trim();

    if (!recipient) {
      setError("Please enter the recipient's email.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(recipient)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");

    try {
      await onShare?.({
        document,
        email: recipient,
        permission
      });
    } catch {
      setError("Unable to share the document. Please try again.");
    }
  };

  return (
    <div
      className="tv-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onClose?.();
        }
      }}
    >
      <section
        className="tv-share-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tv-share-title"
      >
        <div className="tv-share-header">
          <div>
            <span>SECURE DOCUMENT SHARING</span>
            <h2 id="tv-share-title">Share Document</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="tv-share-document">
          <span className="tv-share-file-icon">▤</span>

          <div>
            <strong>
              {document.title ||
                document.original_filename ||
                "Selected document"}
            </strong>

            <small>Selected document</small>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="tv-recipient-email">
            RECIPIENT EMAIL
          </label>

          <input
            id="tv-recipient-email"
            type="email"
            placeholder="Enter recipient email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="tv-document-permission">
            ACCESS PERMISSION
          </label>

          <select
            id="tv-document-permission"
            value={permission}
            onChange={(event) => setPermission(event.target.value)}
          >
            <option value="read">Read Only</option>
            <option value="edit">Read and Edit</option>
          </select>

          <div className="tv-share-security-note">
            <span>◇</span>
            Access is subject to TrustVault authorization checks.
          </div>

          {error && (
            <p className="tv-share-error" role="alert">
              {error}
            </p>
          )}

          <div className="tv-share-actions">
            <button
              type="button"
              className="tv-share-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="tv-share-submit"
              disabled={loading}
            >
              {loading ? "Sharing..." : "Share Document"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ShareDocumentModal;