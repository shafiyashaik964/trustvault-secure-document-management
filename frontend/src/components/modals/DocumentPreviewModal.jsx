import "./DocumentPreviewModal.css";

function DocumentPreviewModal({
  document,
  onClose,
  onDownload
}) {
  if (!document) return null;

  const fileName =
    document.title ||
    document.original_filename ||
    "Untitled Document";

  const fileSize = document.file_size
    ? `${(document.file_size / 1024).toFixed(2)} KB`
    : "Not available";

  const uploadedDate = document.created_at
    ? new Date(document.created_at).toLocaleString()
    : "Not available";

  return (
    <div
      className="tv-preview-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <section
        className="tv-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tv-preview-title"
      >
        <div className="tv-preview-header">
          <div>
            <span>TRUSTVAULT DOCUMENT CENTER</span>
            <h2 id="tv-preview-title">Document Preview</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
          >
            ×
          </button>
        </div>

        <div className="tv-preview-content">

          <div className="tv-preview-icon">▤</div>

          <h3>{fileName}</h3>

          <span className="tv-preview-status">
            ◈ Secure document
          </span>

          <div className="tv-preview-details">

            <div>
              <span>File name</span>
              <strong>
                {document.original_filename || fileName}
              </strong>
            </div>

            <div>
              <span>File size</span>
              <strong>{fileSize}</strong>
            </div>

            <div>
              <span>Category</span>
              <strong>{document.category || "General"}</strong>
            </div>

            <div>
              <span>Uploaded</span>
              <strong>{uploadedDate}</strong>
            </div>

            <div>
              <span>Document ID</span>
              <strong>{document.document_id || "Not available"}</strong>
            </div>

          </div>

          <p className="tv-preview-notice">
            File contents are not displayed in this information preview.
            Use the authorized download action to access the document.
          </p>

        </div>

        <div className="tv-preview-actions">

          <button
            type="button"
            className="tv-preview-close"
            onClick={onClose}
          >
            Close
          </button>

          <button
            type="button"
            className="tv-preview-download"
            onClick={() => onDownload?.(document)}
          >
            ↓ Secure Download
          </button>

        </div>

      </section>
    </div>
  );
}

export default DocumentPreviewModal;