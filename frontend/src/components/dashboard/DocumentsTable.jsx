import "./DocumentsTable.css";

function DocumentsTable({
  documents = [],
  loading = false,
  isOwner = false,
  search = "",
  onDownload,
  onShare,
  onRefresh
}) {
  const formatSize = (bytes) => {
    if (!Number.isFinite(Number(bytes))) return "—";

    const size = Number(bytes);

    return size < 1024 * 1024
      ? `${(size / 1024).toFixed(1)} KB`
      : `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleDateString();
  };

  return (
    <section className="tv-documents-panel">

      <div className="tv-documents-heading">
        <div>
          <span className="tv-documents-eyebrow">
            FILE MANAGEMENT
          </span>

          <h2>
            {isOwner ? "Your Documents" : "Available Documents"}
          </h2>

          <p>{documents.length} documents</p>
        </div>

        <button
          type="button"
          className="tv-documents-refresh"
          onClick={onRefresh}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="tv-documents-empty">
          Loading documents...
        </div>
      ) : documents.length === 0 ? (
        <div className="tv-documents-empty">
          <span>▤</span>
          <strong>
            {search ? "No matching documents" : "No documents available"}
          </strong>
          <p>
            Documents available to your account will appear here.
          </p>
        </div>
      ) : (
        <div className="tv-documents-table-wrap">
          <table className="tv-documents-table">

            <thead>
              <tr>
                <th>DOCUMENT</th>
                <th>CATEGORY</th>
                <th>FILE SIZE</th>
                <th>ADDED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {documents.map((doc) => (
                <tr key={doc.document_id}>

                  <td>
                    <div className="tv-document-name">
                      <span className="tv-document-icon">▤</span>

                      <div>
                        <strong>
                          {doc.title || doc.original_filename}
                        </strong>

                        <small>
                          {doc.original_filename}
                        </small>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className="tv-document-category">
                      {doc.category || "General"}
                    </span>
                  </td>

                  <td>{formatSize(doc.file_size)}</td>

                  <td>{formatDate(doc.created_at)}</td>

                  <td>
                    <div className="tv-document-actions">

                      <button
                        type="button"
                        title="Secure download"
                        onClick={() => onDownload?.(doc)}
                      >
                        ↓
                      </button>

                      {isOwner && (
                        <button
                          type="button"
                          title="Share document"
                          onClick={() => onShare?.(doc)}
                        >
                          ♧
                        </button>
                      )}

                    </div>
                  </td>

                </tr>
              ))}
            </tbody>

          </table>
        </div>
      )}

    </section>
  );
}

export default DocumentsTable;