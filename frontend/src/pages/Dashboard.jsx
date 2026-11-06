
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import API from "../services/api";
import Sidebar from "../components/common/Sidebar.jsx";
import DocumentPreviewModal from "../components/modals/DocumentPreviewModal";

import "./Dashboard.css";

// GET LOGGED-IN USER

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

// FORMAT FILE SIZE

function formatSize(bytes) {
  if (!Number.isFinite(Number(bytes))) return "—";

  const value = Number(bytes);

  return value < 1024 * 1024
    ? `${(value / 1024).toFixed(1)} KB`
    : `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

// FORMAT DATE

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = getStoredUser();

  const role = user?.role || "viewer";
  const isDocumentOwner = role === "document_owner";

  const displayName =
    user?.full_name ||
    user?.name ||
    user?.email ||
    "User";

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();

  // ROUTE-BASED ACTIVE VIEW

  const activeView = (() => {
    switch (location.pathname) {
      case "/documents":
        return "documents";

      case "/shared":
        return "shared";

      default:
        return "dashboard";
    }
  })();

  // DOCUMENT STATES

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const [search, setSearch] = useState("");

  const [showUpload, setShowUpload] = useState(false);

  const [selectedDocument, setSelectedDocument] = useState(null);
  const [previewDocument, setPreviewDocument] = useState(null);

  // UPLOAD STATES

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // NEW DRAG AND DROP STATE

  const [isDragging, setIsDragging] = useState(false);

  // NOTIFICATION

  const notify = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);

    window.clearTimeout(window.__trustVaultMessageTimer);

    window.__trustVaultMessageTimer = window.setTimeout(
      () => setMessage(""),
      5000
    );
  };

  // VALIDATE SELECTED FILE

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "text/plain",
    ];

    const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".txt"];
    const fileName = selectedFile.name.toLowerCase();

    if (
      !allowedTypes.includes(selectedFile.type) ||
      !allowedExtensions.some((extension) => fileName.endsWith(extension))
    ) {
      setFile(null);
      notify("Only PDF, JPG, PNG and TXT files are allowed.", "error");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setFile(null);
      notify("File size cannot exceed 5 MB.", "error");
      return;
    }

    setFile(selectedFile);
  };

  // FETCH DOCUMENTS

  const fetchDocuments = async () => {
    try {
      setLoading(true);

      const response = await API.get("/documents/");

      setDocuments(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (error) {
      notify(
        error.response?.data?.detail ||
          "Unable to load documents.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // DOCUMENT UPLOAD

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!file) {
      return notify("Please choose a document first.", "error");
    }

    if (file.size > 5 * 1024 * 1024) {
      return notify("File size cannot exceed 5 MB.", "error");
    }

    const formData = new FormData();

    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("category", category);
    formData.append("file", file);

    try {
      setUploading(true);

      await API.post("/documents/upload", formData);

      setTitle("");
      setDescription("");
      setCategory("General");
      setFile(null);
      setIsDragging(false);

      const input = window.document.getElementById(
        "tv-document-file"
      );

      if (input) input.value = "";

      setShowUpload(false);

      notify("Document uploaded successfully.");

      await fetchDocuments();
    } catch (error) {
      notify(
        error.response?.data?.detail ||
          "Document upload failed.",
        "error"
      );
    } finally {
      setUploading(false);
    }
  };

  // SECURE DOCUMENT DOWNLOAD

  const handleDownload = async (doc) => {
    try {
      const response = await API.get(
        `/documents/${doc.document_id}/download`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: doc.content_type || "application/octet-stream",
      });

      const url = window.URL.createObjectURL(blob);

      const link = window.document.createElement("a");

      link.href = url;
      link.download =
        doc.original_filename ||
        `${doc.title || "document"}`;

      window.document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      notify("Secure download completed.");
    } catch (error) {
      notify(
        error.response?.data?.detail ||
          "Download denied or unavailable.",
        "error"
      );
    }
  };

  // OPEN SHARE MODAL

  const openShare = (doc) => {
    setSelectedDocument(doc);

    setShareEmail("");
    setSharePermission("read");

    setShareResult(null);
    setRevokeUserId("");
  };

  // SHARE STATES

  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState("read");

  const [sharing, setSharing] = useState(false);
  const [shareResult, setShareResult] = useState(null);

  const [revokeUserId, setRevokeUserId] = useState("");
  const [revoking, setRevoking] = useState(false);

  // GRANT PERMISSION

  const handleShare = async (event) => {
    event.preventDefault();

    if (!selectedDocument) return;

    try {
      setSharing(true);

      const response = await API.post(
        `/permissions/${selectedDocument.document_id}/grant`,
        {
          user_email: shareEmail.trim(),
          permission: sharePermission,
        }
      );

      setShareResult(response.data);

      setRevokeUserId(response.data?.user_id || "");
      setShareEmail("");

      notify(
        response.data?.message ||
          "Permission granted successfully."
      );
    } catch (error) {
      notify(
        error.response?.data?.detail ||
          "Unable to share this document.",
        "error"
      );
    } finally {
      setSharing(false);
    }
  };

  // REVOKE PERMISSION

  const handleRevoke = async (event) => {
    event.preventDefault();

    if (!selectedDocument) return;

    if (!revokeUserId.trim()) {
      return notify(
        "Enter the recipient user ID returned by the share operation.",
        "error"
      );
    }

    try {
      setRevoking(true);

      const response = await API.delete(
        `/permissions/${selectedDocument.document_id}/revoke/${revokeUserId.trim()}`
      );

      notify(
        response.data?.message ||
          "Permission revoked successfully."
      );

      setShareResult(null);
      setRevokeUserId("");

      await fetchDocuments();
    } catch (error) {
      notify(
        error.response?.data?.detail ||
          "Unable to revoke permission.",
        "error"
      );
    } finally {
      setRevoking(false);
    }
  };

  // LOGOUT

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    navigate("/login", { replace: true });
  };

  // DOCUMENT OWNERSHIP

  const currentUserId = String(
    user?.id || user?.user_id || ""
  );

  const isOwnedByCurrentUser = (doc) => {
    const ownerId =
      doc.owner_id ??
      doc.user_id ??
      doc.owner?.id ??
      doc.owner?.user_id;

    if (
      ownerId !== undefined &&
      ownerId !== null &&
      currentUserId
    ) {
      return String(ownerId) === currentUserId;
    }

    const ownerEmail =
      doc.owner_email ??
      doc.owner?.email;

    if (ownerEmail && user?.email) {
      return (
        String(ownerEmail).toLowerCase() ===
        String(user.email).toLowerCase()
      );
    }

    return false;
  };

  // DOCUMENT FILTERING AND SEARCH

  const filteredDocuments = useMemo(() => {
    let result = [...documents];

    if (activeView === "documents" && isDocumentOwner) {
      result = result.filter(isOwnedByCurrentUser);
    }

    if (activeView === "shared") {
      result = result.filter(
        (doc) => !isOwnedByCurrentUser(doc)
      );
    }

    const query = search.trim().toLowerCase();

    if (query) {
      result = result.filter((doc) =>
        [
          doc.title,
          doc.category,
          doc.original_filename,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query)
        )
      );
    }

    return result;
  }, [
    documents,
    search,
    activeView,
    isDocumentOwner,
    currentUserId,
    user?.email,
  ]);

  // DASHBOARD STATISTICS

  const ownedCount = documents.filter(
    isOwnedByCurrentUser
  ).length;

  const sharedCount = documents.filter(
    (doc) => !isOwnedByCurrentUser(doc)
  ).length;

  // PAGE TITLES

  const pageTitle =
    activeView === "documents"
      ? isDocumentOwner
        ? "My Documents"
        : "Available Documents"
      : activeView === "shared"
      ? "Shared With Me"
      : "Your Secure Workspace";

  const pageDescription =
    activeView === "dashboard"
      ? "Your secure document workspace at a glance."
      : activeView === "documents"
      ? "Manage and organize documents in your personal vault."
      : "Access documents that have been shared with your account.";

  // DOCUMENT TABLE

  const renderDocumentTable = () => (
    loading ? (
      <div className="tv-empty">
        <div className="tv-spinner" />
        <strong>Loading your documents</strong>
        <span>Checking your authorized workspace…</span>
      </div>
    ) : filteredDocuments.length === 0 ? (
      <div className="tv-empty">
        <div className="tv-empty-icon">▤</div>

        <strong>
          {search
            ? "No matching documents"
            : activeView === "shared"
            ? "No shared documents found"
            : "No documents yet"}
        </strong>

        <span>
          {search
            ? "Try another title, filename or category."
            : activeView === "shared"
            ? "Documents shared with your account will appear here."
            : isDocumentOwner
            ? "Upload your first document to get started."
            : "Documents shared with your account will appear here."}
        </span>

        {isDocumentOwner &&
          activeView !== "shared" &&
          !search && (
            <button
              className="tv-primary"
              onClick={() => setShowUpload(true)}
            >
              ＋ Upload document
            </button>
          )}
      </div>
    ) : (
      <div className="tv-table-wrap">
        <table className="tv-table">
          <thead>
            <tr>
              <th>DOCUMENT</th>
              <th>CATEGORY</th>
              <th>FILE SIZE</th>
              <th>ADDED</th>
              <th className="actions-col">ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {filteredDocuments.map((doc) => (
              <tr key={doc.document_id}>
                <td>
                  <div className="tv-file-cell">
                    <div className="tv-file-icon">▤</div>

                    <div>
                      <strong>
                        {doc.title || doc.original_filename}
                      </strong>
                      <span>{doc.original_filename}</span>
                    </div>
                  </div>
                </td>

                <td>
                  <span className="tv-category">
                    {doc.category || "General"}
                  </span>
                </td>

                <td>{formatSize(doc.file_size)}</td>

                <td>{formatDate(doc.created_at)}</td>

                <td>
                  <div className="tv-row-actions">
                    <button
                      title="Preview document details"
                      onClick={() => setPreviewDocument(doc)}
                    >
                      👁
                    </button>

                    <button
                      title="Secure download"
                      onClick={() => handleDownload(doc)}
                    >
                      ↓
                    </button>

                    {isDocumentOwner &&
                      isOwnedByCurrentUser(doc) && (
                        <button
                          title="Share document"
                          onClick={() => openShare(doc)}
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
    )
  );

  return (
    <div className="tv-shell">

      {/* SIDEBAR */}

      <Sidebar
        user={user}
        onLogout={handleLogout}
      />

      {/* MAIN CONTENT */}

      <main className="tv-main">

        {/* TOPBAR */}

        <header className="tv-topbar">
          <div className="tv-breadcrumb">
            Workspace <span>/</span>

            {activeView === "dashboard"
              ? "Dashboard"
              : activeView === "documents"
              ? "My Documents"
              : "Shared With Me"}
          </div>

          <div className="tv-top-actions">
            <label className="tv-search">
              <span>⌕</span>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents..."
              />
            </label>

            <div className="tv-secure-pill">
              <i /> Secure session
            </div>

            <button
              className="tv-logout"
              onClick={handleLogout}
            >
              Logout <span>↗</span>
            </button>
          </div>
        </header>

        {/* PAGE HEADER */}

        <section className="tv-welcome">
          <div>
            <div className="tv-eyebrow">
              {activeView === "dashboard"
                ? "YOUR SECURE WORKSPACE"
                : activeView === "documents"
                ? "PERSONAL FILE MANAGEMENT"
                : "SHARED ACCESS"}
            </div>

            <h1>
              {activeView === "dashboard"
                ? `Welcome back, ${displayName.split(" ")[0]}`
                : pageTitle}
              <span>.</span>
            </h1>

            <p>{pageDescription}</p>
          </div>

          {isDocumentOwner &&
            activeView !== "shared" && (
              <button
                className="tv-primary"
                onClick={() => setShowUpload(true)}
              >
                <span>＋</span> Upload document
              </button>
            )}
        </section>

        {/* NOTIFICATION */}

        {message && (
          <div
            className={`tv-toast ${messageType}`}
            role="status"
          >
            {message}
          </div>
        )}

        {/* DASHBOARD ONLY: STATISTICS */}

        {activeView === "dashboard" && (
          <section className="tv-stats">
            <article className="tv-stat-card">
              <div className="tv-stat-icon cyan">▤</div>

              <div>
                <strong>{documents.length}</strong>
                <span>Documents in workspace</span>
              </div>

              <small>LIVE</small>
            </article>

            <article className="tv-stat-card">
              <div className="tv-stat-icon teal">♧</div>

              <div>
                <strong>{sharedCount}</strong>
                <span>Shared documents</span>
              </div>
            </article>

            <article className="tv-stat-card">
              <div className="tv-stat-icon blue">◈</div>

              <div>
                <strong>{ownedCount}</strong>
                <span>My documents</span>
              </div>
            </article>

            <article className="tv-stat-card">
              <div className="tv-stat-icon green">✓</div>

              <div>
                <strong>Active</strong>
                <span>Secure session status</span>
              </div>
            </article>
          </section>
        )}

        {/* CONTENT GRID */}

        <section
          className={`tv-content-grid ${
            activeView !== "dashboard"
              ? "tv-full-width"
              : ""
          }`}
        >

          {/* DOCUMENT PANEL */}

          <article className="tv-panel tv-doc-panel">
            <div className="tv-panel-heading">
              <div>
                <div className="tv-eyebrow">
                  {activeView === "dashboard"
                    ? "RECENT ACTIVITY"
                    : activeView === "documents"
                    ? "MY FILE COLLECTION"
                    : "DOCUMENTS SHARED WITH YOU"}
                </div>

                <h2>
                  {activeView === "dashboard"
                    ? "Recent documents"
                    : pageTitle}
                </h2>

                <p>
                  {filteredDocuments.length}{" "}
                  {filteredDocuments.length === 1
                    ? "file"
                    : "files"}{" "}
                  shown
                </p>
              </div>

              <button
                className="tv-quiet-button"
                onClick={fetchDocuments}
                disabled={loading}
              >
                ↻ Refresh
              </button>
            </div>

            {renderDocumentTable()}
          </article>

          {/* DASHBOARD ONLY: QUICK ACTIONS AND PROFILE */}

          {activeView === "dashboard" && (
            <aside className="tv-right-column">

              <article className="tv-panel tv-quick-panel">
                <div className="tv-eyebrow">
                  QUICK ACTIONS
                </div>

                <h2>Workspace tools</h2>

                {isDocumentOwner ? (
                  <button
                    className="tv-action-link"
                    onClick={() => setShowUpload(true)}
                  >
                    <span>＋</span>

                    <div>
                      <strong>Upload a document</strong>
                      <small>
                        Add a file to your secure vault
                      </small>
                    </div>

                    <b>›</b>
                  </button>
                ) : (
                  <div className="tv-action-link static">
                    <span>✓</span>

                    <div>
                      <strong>Authorized access</strong>
                      <small>
                        Downloads are checked by the server
                      </small>
                    </div>
                  </div>
                )}

                <button
                  className="tv-action-link"
                  onClick={() => navigate("/documents")}
                >
                  <span>⌕</span>

                  <div>
                    <strong>Find a document</strong>
                    <small>
                      Search your available files
                    </small>
                  </div>

                  <b>›</b>
                </button>

                <button
                  className="tv-action-link"
                  onClick={() => navigate("/shared")}
                >
                  <span>⇄</span>

                  <div>
                    <strong>Shared with me</strong>
                    <small>
                      View documents shared with you
                    </small>
                  </div>

                  <b>›</b>
                </button>

                <div className="tv-security-note">
                  <div>♢</div>

                  <p>
                    <strong>Security first</strong>

                    <span>
                      Every download is checked against current
                      permissions. Revoked access is denied on
                      future requests.
                    </span>
                  </p>
                </div>
              </article>

              <article className="tv-panel tv-profile-panel">
                <div className="tv-eyebrow">
                  ACCOUNT
                </div>

                <div className="tv-profile-row">
                  <div className="tv-avatar large">
                    {initials || "U"}
                  </div>

                  <div>
                    <strong>{displayName}</strong>
                    <span>{role.replace(/_/g, " ")}</span>
                  </div>
                </div>

                <div className="tv-profile-foot">
                  <span>Session</span>

                  <b>
                    <i /> Authenticated
                  </b>
                </div>
              </article>

            </aside>
          )}
        </section>

        {/* FOOTER */}

        <footer className="tv-footer">
          <span>© 2026 TrustVault</span>

          <span>
            Secure document sharing · Role-based access · Auditable activity
          </span>
        </footer>
      </main>

      {/* UPLOAD DOCUMENT MODAL */}

      {showUpload && (
        <div
          className="tv-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowUpload(false);
            }
          }}
        >
          <section
            className="tv-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-title"
          >
            <div className="tv-modal-heading">
              <div>
                <div className="tv-eyebrow">
                  ADD TO YOUR VAULT
                </div>

                <h2 id="upload-title">
                  Upload document
                </h2>

                <p>
                  Files are stored privately and accessed
                  through permission checks.
                </p>
              </div>

              <button
                className="tv-modal-close"
                onClick={() => setShowUpload(false)}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleUpload}
              className="tv-form"
            >
              <label>
                Document title

                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Project Report"
                  maxLength={200}
                  required
                />
              </label>

              <label>
                Description{" "}
                <span className="tv-optional">Optional</span>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a short description"
                  maxLength={5000}
                  rows="3"
                />
              </label>

              <label>
                Category

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option>General</option>
                  <option>Contracts</option>
                  <option>Salary Letters</option>
                  <option>Reports</option>
                  <option>Other</option>
                </select>
              </label>

              {/* NEW DRAG AND DROP UPLOAD AREA */}

              <div
                className={`tv-drop-zone ${
                  isDragging ? "dragging" : ""
                } ${file ? "file-selected" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setIsDragging(false);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileSelect(e.dataTransfer.files?.[0]);
                }}
              >
                <input
                  id="tv-document-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.txt"
                  aria-label="Choose a document"
                  onChange={(e) => {
                    handleFileSelect(e.target.files?.[0]);
                  }}
                />

                <div className="tv-drop-icon">⇧</div>

                <strong>
                  {file
                    ? "Document selected"
                    : "Drag and drop your file here"}
                </strong>

                <span>
                  {file
                    ? file.name
                    : "or click below to browse your computer"}
                </span>

                {file && (
                  <small>{formatSize(file.size)}</small>
                )}

                <label
                  htmlFor="tv-document-file"
                  className="tv-browse-button"
                >
                  Browse files
                </label>

                <small className="tv-drop-help">
                  PDF, JPG, PNG or TXT · Maximum 5 MB
                </small>
              </div>

              <div className="tv-modal-actions">
                <button
                  type="button"
                  className="tv-secondary"
                  onClick={() => setShowUpload(false)}
                >
                  Cancel
                </button>

                <button
                  className="tv-primary"
                  disabled={uploading}
                >
                  {uploading
                    ? "Uploading…"
                    : "Upload document"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* SHARE DOCUMENT MODAL */}

      {selectedDocument && (
        <div
          className="tv-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedDocument(null);
            }
          }}
        >
          <section
            className="tv-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-title"
          >
            <div className="tv-modal-heading">
              <div>
                <div className="tv-eyebrow">
                  ACCESS CONTROL
                </div>

                <h2 id="share-title">
                  Share document
                </h2>

                <p>
                  {selectedDocument.title ||
                    selectedDocument.original_filename}
                </p>
              </div>

              <button
                className="tv-modal-close"
                onClick={() => setSelectedDocument(null)}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleShare}
              className="tv-form"
            >
              <label>
                Recipient email

                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="person@example.com"
                  required
                />
              </label>

              <label>
                Permission

                <select
                  value={sharePermission}
                  onChange={(e) =>
                    setSharePermission(e.target.value)
                  }
                >
                  <option value="read">Read only</option>
                  <option value="edit">Read and edit</option>
                </select>
              </label>

              <div className="tv-permission-info">
                Access is granted to this document only.
                You can revoke it later.
              </div>

              <div className="tv-modal-actions">
                <button
                  type="button"
                  className="tv-secondary"
                  onClick={() => setSelectedDocument(null)}
                >
                  Close
                </button>

                <button
                  className="tv-primary"
                  disabled={sharing}
                >
                  {sharing
                    ? "Sharing…"
                    : "Grant access"}
                </button>
              </div>
            </form>

            {shareResult && (
              <div className="tv-share-result">
                <strong>Permission granted</strong>

                <span>
                  {shareResult.message ||
                    "The recipient has been granted access."}
                </span>

                {shareResult.user_id ? (
                  <form
                    onSubmit={handleRevoke}
                    className="tv-revoke-form"
                  >
                    <label>
                      Recipient user ID

                      <input
                        value={revokeUserId}
                        onChange={(e) =>
                          setRevokeUserId(e.target.value)
                        }
                      />
                    </label>

                    <button
                      className="tv-danger"
                      disabled={revoking}
                    >
                      {revoking
                        ? "Revoking…"
                        : "Revoke access"}
                    </button>
                  </form>
                ) : (
                  <small>
                    The API did not return a recipient user ID,
                    so revocation must be performed using the
                    recipient's user ID.
                  </small>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}

      {previewDocument && (
        <DocumentPreviewModal
          document={previewDocument}
          onClose={() => setPreviewDocument(null)}
          onDownload={handleDownload}
        />
      )}

    </div>
  );
}

export default Dashboard;
