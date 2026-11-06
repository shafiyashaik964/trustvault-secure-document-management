
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import API from "../../services/api";
import Sidebar from "../../components/common/Sidebar.jsx";

import "./ViewerDashboard.css";

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

// GET FILE ICON
function getFileIcon(contentType) {
  if (contentType?.includes("pdf")) return "PDF";
  if (contentType?.includes("image")) return "IMG";
  if (contentType?.includes("text")) return "TXT";

  return "FILE";
}

function ViewerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = getStoredUser();

  const displayName =
    user?.full_name ||
    user?.name ||
    user?.email ||
    "Viewer";

  const firstName = displayName.split(" ")[0];

  const role = user?.role || "viewer";

  // DOCUMENT STATES
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const [downloadingId, setDownloadingId] = useState(null);

  // CURRENT PAGE
  const activeView =
    location.pathname === "/documents"
      ? "documents"
      : location.pathname === "/shared"
      ? "shared"
      : "dashboard";

  // PAGE INFORMATION
  const pageTitle =
    activeView === "documents"
      ? "My Documents"
      : activeView === "shared"
      ? "Shared Documents"
      : "Viewer Dashboard";

  // NOTIFICATIONS
  const notify = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  // FETCH AUTHORIZED DOCUMENTS
  const fetchDocuments = async () => {
    try {
      setLoading(true);

      const response = await API.get("/documents/");

      setDocuments(
        Array.isArray(response.data)
          ? response.data
          : []
      );

    } catch (error) {
      setDocuments([]);

      notify(
        error.response?.data?.detail ||
          "Unable to load your authorized documents.",
        "error"
      );

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // SEARCH DOCUMENTS
  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return documents;

    return documents.filter((doc) =>
      [
        doc.title,
        doc.original_filename,
        doc.category,
        doc.content_type,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query)
      )
    );
  }, [documents, search]);

  // STATISTICS
  const totalDocuments = documents.length;

  const pdfCount = documents.filter(
    (doc) => doc.content_type?.includes("pdf")
  ).length;

  const imageCount = documents.filter(
    (doc) => doc.content_type?.includes("image")
  ).length;

  const latestDocument = [...documents].sort(
    (a, b) =>
      new Date(b.created_at || 0) -
      new Date(a.created_at || 0)
  )[0];

  // SECURE DOWNLOAD
  const handleDownload = async (doc) => {
    try {
      setDownloadingId(doc.document_id);

      const response = await API.get(
        `/documents/${doc.document_id}/download`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type:
          doc.content_type ||
          "application/octet-stream",
      });

      const url = window.URL.createObjectURL(blob);

      const link = window.document.createElement("a");

      link.href = url;

      link.download =
        doc.original_filename ||
        doc.title ||
        "document";

      window.document.body.appendChild(link);

      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      notify("Document downloaded successfully.");

    } catch (error) {
      notify(
        error.response?.data?.detail ||
          "Download denied or unavailable.",
        "error"
      );

    } finally {
      setDownloadingId(null);
    }
  };

  // LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    navigate("/login", { replace: true });
  };

  // DOCUMENT TABLE
  const renderDocuments = () => {
    if (loading) {
      return (
        <div className="vd-empty">
          <div className="vd-spinner" />
          <strong>Loading documents...</strong>
          <span>Checking your authorized files.</span>
        </div>
      );
    }

    if (filteredDocuments.length === 0) {
      return (
        <div className="vd-empty">
          <div className="vd-empty-icon">▤</div>

          <strong>
            {search
              ? "No matching documents"
              : "No documents available"}
          </strong>

          <span>
            {search
              ? "Try searching with another filename."
              : "Documents shared with your account will appear here."}
          </span>
        </div>
      );
    }

    return (
      <div className="vd-table-wrap">
        <table className="vd-table">
          <thead>
            <tr>
              <th>DOCUMENT</th>
              <th>OWNER</th>
              <th>DATE ADDED</th>
              <th>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {filteredDocuments.map((doc) => (
              <tr key={doc.document_id}>
                <td>
                  <div className="vd-file-cell">
                    <div className="vd-file-icon">
                      {getFileIcon(doc.content_type)}
                    </div>

                    <div>
                      <strong>
                        {doc.title || doc.original_filename}
                      </strong>

                      <span>
                        {doc.original_filename}
                      </span>
                    </div>
                  </div>
                </td>

                <td>
                  {doc.owner_name ||
                    doc.owner?.full_name ||
                    doc.owner_email ||
                    "Owner details unavailable"}
                </td>

                <td>
                  {formatDate(doc.created_at)}
                </td>

                <td>
                  <button
                    className="vd-download-btn"
                    title="Download document"
                    disabled={
                      downloadingId === doc.document_id
                    }
                    onClick={() => handleDownload(doc)}
                  >
                    {downloadingId === doc.document_id
                      ? "..."
                      : "↓"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="vd-shell">

      {/* SIDEBAR */}
      <Sidebar
        user={user}
        onLogout={handleLogout}
      />

      {/* MAIN CONTENT */}
      <main className="vd-main">

        {/* TOP NAVIGATION */}
        <header className="vd-topbar">

          <div className="vd-page-label">
            <span className="vd-title-icon">T</span>
            {pageTitle}
          </div>

          <div className="vd-top-actions">

            <label className="vd-search">
              <span>⌕</span>

              <input
                type="text"
                placeholder="Search documents..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />
            </label>

            <span
              className="vd-notification"
              title="Notifications"
            >
              ♧
            </span>

            <button
              className="vd-logout"
              onClick={handleLogout}
            >
              Logout
            </button>

          </div>
        </header>

        {/* WELCOME SECTION */}
        <section className="vd-welcome">

          <div className="vd-welcome-icon">
            ◉
          </div>

          <div className="vd-welcome-text">
            <h1>
              Welcome back, {firstName}!
            </h1>

            <p>
              View your authorized documents securely.
            </p>
          </div>

          <div className="vd-access">
            <span /> Access: Limited to your permissions
          </div>

        </section>

        {/* NOTIFICATION */}
        {message && (
          <div
            className={`vd-toast ${messageType}`}
            role="status"
          >
            {message}
            <button onClick={() => setMessage("")}>
              ×
            </button>
          </div>
        )}

        {/* STATISTICS */}
        {activeView === "dashboard" && (
          <section className="vd-stats">

            <article className="vd-stat-card">
              <div className="vd-stat-icon cyan">
                ▤
              </div>

              <div>
                <strong>{totalDocuments}</strong>
                <span>Available Documents</span>
              </div>
            </article>

            <article className="vd-stat-card">
              <div className="vd-stat-icon blue">
                PDF
              </div>

              <div>
                <strong>{pdfCount}</strong>
                <span>PDF Documents</span>
              </div>
            </article>

            <article className="vd-stat-card">
              <div className="vd-stat-icon teal">
                ▧
              </div>

              <div>
                <strong>{imageCount}</strong>
                <span>Image Documents</span>
              </div>
            </article>

            <article className="vd-stat-card">
              <div className="vd-stat-icon green">
                ✓
              </div>

              <div>
                <strong>Read Only</strong>
                <span>Account Permissions</span>
              </div>
            </article>

          </section>
        )}

        {/* MAIN DASHBOARD GRID */}
        <section
          className={`vd-content-grid ${
            activeView !== "dashboard"
              ? "vd-full-width"
              : ""
          }`}
        >

          {/* AVAILABLE DOCUMENTS */}
          <article className="vd-panel vd-doc-panel">

            <div className="vd-panel-heading">

              <div>
                <h2>
                  {activeView === "dashboard"
                    ? "Available Documents"
                    : pageTitle}
                </h2>

                <p>
                  {filteredDocuments.length} documents available
                </p>
              </div>

              <button
                className="vd-refresh"
                onClick={fetchDocuments}
                disabled={loading}
              >
                ↻ Refresh
              </button>

            </div>

            {renderDocuments()}

          </article>

          {/* RECENT ACTIVITY */}
          {activeView === "dashboard" && (
            <aside className="vd-panel vd-activity-panel">

              <h2>Recent Activity</h2>

              <div className="vd-activity-content">

                <div className="vd-activity-icon">
                  ◷
                </div>

                <strong>
                  Activity history
                </strong>

                <p>
                  Your document activity will appear here
                  when Viewer activity history is available.
                </p>

              </div>

              <div className="vd-latest-document">

                <span>RECENTLY ADDED DOCUMENT</span>

                {latestDocument ? (
                  <>
                    <strong>
                      {latestDocument.title ||
                        latestDocument.original_filename}
                    </strong>

                    <small>
                      Added {formatDate(latestDocument.created_at)}
                    </small>
                  </>
                ) : (
                  <small>No documents available.</small>
                )}

              </div>

            </aside>
          )}

        </section>

        {/* SECURITY INFORMATION */}
        {activeView === "dashboard" && (
          <section className="vd-security">

            <div className="vd-security-icon">
              ♢
            </div>

            <div>
              <strong>TrustVault Security</strong>

              <p>
                Your account has read-only access.
                Document downloads are verified by the server
                against your current permissions.
              </p>
            </div>

          </section>
        )}

        {/* FOOTER */}
        <footer className="vd-footer">
          <span>© 2026 TrustVault</span>

          <span>
            Secure Document Management System
          </span>
        </footer>

      </main>
    </div>
  );
}

export default ViewerDashboard;
