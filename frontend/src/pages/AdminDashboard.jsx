
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [users, setUsers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [roleRequests, setRoleRequests] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verification, setVerification] = useState(null);

  // UPLOAD STATES
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCategory, setUploadCategory] = useState("General");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  // LOAD DASHBOARD DATA
  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    const requests = await Promise.allSettled([
      API.get("/auth/users"),
      API.get("/documents/"),
      API.get("/admin/audit/?limit=100"),
      API.get("/auth/role-requests"),
      API.get("/permissions/")
    ]);

    const [
      userResult,
      docResult,
      logResult,
      requestResult,
      permissionResult
    ] = requests;

    // USERS
    if (userResult.status === "fulfilled") {
      const data = userResult.value.data;

      setUsers(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.users)
          ? data.users
          : []
      );
    } else {
      console.error(
        "Users API failed:",
        userResult.reason?.response?.status,
        userResult.reason?.response?.data || userResult.reason?.message
      );
    }

    // DOCUMENTS
    if (docResult.status === "fulfilled") {
      const data = docResult.value.data;

      setDocuments(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.documents)
          ? data.documents
          : []
      );
    } else {
      console.error(
        "Documents API failed:",
        docResult.reason?.response?.status,
        docResult.reason?.response?.data || docResult.reason?.message
      );
    }

    // AUDIT LOGS
    if (logResult.status === "fulfilled") {
      const data = logResult.value.data;

      setLogs(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.logs)
          ? data.logs
          : []
      );
    } else {
      console.error(
        "Audit Logs API failed:",
        logResult.reason?.response?.status,
        logResult.reason?.response?.data || logResult.reason?.message
      );
    }

    // ROLE REQUESTS
    if (requestResult.status === "fulfilled") {
      const data = requestResult.value.data;

      setRoleRequests(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.requests)
          ? data.requests
          : []
      );
    } else {
      console.error(
        "Role Requests API failed:",
        requestResult.reason?.response?.status,
        requestResult.reason?.response?.data || requestResult.reason?.message
      );
    }

    // PERMISSIONS
    if (permissionResult.status === "fulfilled") {
      const data = permissionResult.value.data;

      setPermissions(
        Array.isArray(data?.permissions)
          ? data.permissions
          : Array.isArray(data)
          ? data
          : []
      );
    } else {
      console.error(
        "Permissions API failed:",
        permissionResult.reason?.response?.status,
        permissionResult.reason?.response?.data || permissionResult.reason?.message
      );
    }

    if (requests.some((item) => item.status === "rejected")) {
      setError("Some dashboard information could not be loaded. Check the browser console for failed API requests.");
    }

    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // APPROVE ROLE REQUEST
  const handleApprove = async (userId) => {
    if (!userId) {
      alert("User ID is missing. Unable to approve request.");
      return;
    }

    try {
      await API.post(`/auth/role-requests/${userId}/approve`);

      alert("Document Owner request approved successfully.");

      await loadDashboard();
    } catch (err) {
      console.error("Role approval failed:", err);

      alert(
        err.response?.data?.detail ||
        "Unable to approve request."
      );
    }
  };

  // VERIFY AUDIT
  const verifyAudit = async () => {
    try {
      const response = await API.get("/admin/audit/verify");
      setVerification(response.data);
    } catch (err) {
      console.error("Audit verification failed:", err);

      setVerification({
        error:
          err.response?.data?.detail ||
          "Verification failed."
      });
    }
  };

  // FILE SELECTION VALIDATION
  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "text/plain"
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      alert("Only PDF, JPG, PNG and TXT files are allowed.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      alert("File size cannot exceed 5 MB.");
      return;
    }

    setUploadFile(selectedFile);
  };

  // RESET UPLOAD FORM
  const resetUploadForm = () => {
    setUploadTitle("");
    setUploadDescription("");
    setUploadCategory("General");
    setUploadFile(null);
    setIsDragging(false);

    const input = document.getElementById(
      "admin-document-file"
    );

    if (input) {
      input.value = "";
    }
  };

  // CLOSE UPLOAD MODAL
  const closeUpload = () => {
    if (uploading) return;

    setShowUpload(false);
    resetUploadForm();
  };

  // UPLOAD DOCUMENT
  const handleUpload = async (event) => {
    event.preventDefault();

    if (!uploadTitle.trim()) {
      alert("Please enter a document title.");
      return;
    }

    if (!uploadFile) {
      alert("Please select a document first.");
      return;
    }

    if (uploadFile.size > 5 * 1024 * 1024) {
      alert("File size cannot exceed 5 MB.");
      return;
    }

    const formData = new FormData();

    formData.append("title", uploadTitle.trim());
    formData.append("description", uploadDescription.trim());
    formData.append("category", uploadCategory);
    formData.append("file", uploadFile);

    try {
      setUploading(true);

      await API.post("/documents/upload", formData);

      alert("Document uploaded successfully.");

      setShowUpload(false);
      resetUploadForm();

      await loadDashboard();
    } catch (err) {
      console.error("Document upload failed:", err);

      alert(
        err.response?.data?.detail ||
        "Document upload failed."
      );
    } finally {
      setUploading(false);
    }
  };

  // DASHBOARD CALCULATIONS
  const activeUsers = users.filter(
    (user) => user.is_active
  ).length;

  const deniedEvents = logs.filter(
    (log) => ["DENIED", "FAILED"].includes(log.outcome)
  );

  // BACKEND RETURNS status AND user_id
  const pendingRequests = roleRequests.filter(
    (user) => user.status === "pending"
  );

  const successfulEvents = logs.filter(
    (log) => log.outcome === "SUCCESS"
  ).length;

  const securePercentage = logs.length
    ? Math.round(
        (successfulEvents / logs.length) * 100
      )
    : 0;

  // SEARCH FILTERS
  const filteredUsers = users.filter((user) =>
    `${user.full_name || ""} ${user.email || ""} ${user.role || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredDocuments = documents.filter((doc) =>
    `${doc.title || ""} ${doc.filename || ""} ${doc.original_filename || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredLogs = logs.filter((log) =>
    `${log.action || ""} ${log.outcome || ""} ${log.actor_id || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // FORMAT DATE
  const formatDate = (date) => {
    if (!date) return "-";

    const value = new Date(date);

    return Number.isNaN(value.getTime())
      ? "-"
      : value.toLocaleString();
  };

  // FORMAT FILE SIZE
  const formatSize = (bytes) => {
    if (!Number.isFinite(Number(bytes))) return "-";

    const value = Number(bytes);

    return value < 1024 * 1024
      ? `${(value / 1024).toFixed(1)} KB`
      : `${(value / (1024 * 1024)).toFixed(2)} MB`;
  };

  // NAVIGATION
  const navigation = [
    { id: "dashboard", icon: "⌂", label: "Dashboard" },
    { id: "users", icon: "♙", label: "Manage Users" },
    { id: "documents", icon: "▣", label: "Documents" },
    { id: "activity", icon: "▤", label: "Audit Logs" },
    { id: "reports", icon: "▥", label: "Reports" },
    { id: "settings", icon: "⚙", label: "Settings" }
  ];

  const recentLogs = [...logs].slice(0, 5);

  return (
    <div className="admin-layout">

      {/* SIDEBAR */}
      <aside className="admin-sidebar">

        <div className="admin-brand">
          <span className="brand-shield">T</span>
          <span>TrustVault</span>
        </div>

        <nav className="admin-nav">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={`admin-nav-item ${
                activeTab === item.id ? "active" : ""
              }`}
              onClick={() => {
                setActiveTab(item.id);
                setSearch("");
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-avatar">
            {(storedUser.full_name || "A")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="admin-profile-info">
            <strong>
              {storedUser.full_name || "Administrator"}
            </strong>
            <span>{storedUser.role || "Admin"}</span>
          </div>
        </div>

      </aside>

      {/* MAIN CONTENT */}
      <main className="admin-main">

        {/* TOPBAR */}
        <header className="admin-topbar">

          <div className="admin-search">
            <span>⌕</span>

            <input
              placeholder="Search anything..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="admin-top-actions">
            <span className="admin-notification">♧</span>

            <button
              className="admin-logout"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>

        </header>

        {error && (
          <div className="admin-error">
            {error}
          </div>
        )}

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <>
            <section className="admin-welcome">
              <div>
                <span className="admin-eyebrow">
                  TRUSTVAULT ADMINISTRATION
                </span>

                <h1>Welcome back, Admin!</h1>

                <p>
                  Monitor activity and manage the system securely.
                </p>
              </div>

              <span className="welcome-shield">✓</span>
            </section>

            <section className="admin-stats">

              <div className="admin-stat-card">
                <span className="stat-icon cyan">♙</span>

                <div>
                  <span>Total Users</span>
                  <h2>{loading ? "..." : users.length}</h2>
                </div>
              </div>

              <div className="admin-stat-card">
                <span className="stat-icon blue">▣</span>

                <div>
                  <span>Total Documents</span>
                  <h2>{loading ? "..." : documents.length}</h2>
                </div>
              </div>

              <div className="admin-stat-card">
                <span className="stat-icon green">↗</span>

                <div>
                  <span>Today's Activity</span>
                  <h2>{loading ? "..." : logs.length}</h2>
                </div>
              </div>

              <div className="admin-stat-card">
                <span className="stat-icon red">⚠</span>

                <div>
                  <span>Security Alerts</span>
                  <h2>{loading ? "..." : deniedEvents.length}</h2>
                </div>
              </div>

            </section>

            <section className="admin-dashboard-grid">

              <div className="admin-panel recent-panel">

                <div className="panel-heading">
                  <h2>Recent Activity</h2>

                  <button
                    onClick={() => setActiveTab("activity")}
                  >
                    View All →
                  </button>
                </div>

                {recentLogs.length === 0 ? (
                  <p className="admin-empty">
                    No activity records found.
                  </p>
                ) : (
                  recentLogs.map((log, index) => (
                    <div
                      className="activity-row"
                      key={log.id || index}
                    >
                      <span className="activity-dot">
                        {log.outcome === "SUCCESS" ? "✓" : "!"}
                      </span>

                      <span className="activity-description">
                        {log.action || "System activity"}
                      </span>

                      <small>
                        {formatDate(log.created_at)}
                      </small>
                    </div>
                  ))
                )}

              </div>

              <div className="admin-panel overview-panel">

                <h2>System Overview</h2>

                <div
                  className="overview-circle"
                  style={{
                    background: `conic-gradient(#08c9a4 ${
                      securePercentage * 3.6
                    }deg, #243d5b 0deg)`
                  }}
                >
                  <div>{securePercentage}%</div>
                </div>

                <p className="overview-caption">
                  Successful audit events
                </p>

                <div className="overview-legend">
                  <span>
                    ● Successful: {successfulEvents}
                  </span>

                  <span>
                    ● Denied / Failed: {deniedEvents.length}
                  </span>
                </div>

              </div>

            </section>

            <section className="admin-panel requests-panel">

              <div className="panel-heading">
                <h2>
                  Permission Requests
                  <span className="request-count">
                    {pendingRequests.length}
                  </span>
                </h2>
              </div>

              {pendingRequests.length === 0 ? (
                <p className="admin-empty">
                  No pending role requests.
                </p>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-table">

                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Requested Role</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {pendingRequests.map((user) => (
                        <tr key={user.user_id}>
                          <td>
                            {user.full_name || user.email}
                          </td>

                          <td>
                            {user.requested_role || "-"}
                          </td>

                          <td>
                            <span className="status-pending">
                              Pending
                            </span>
                          </td>

                          <td>
                            <button
                              className="approve-button"
                              onClick={() => handleApprove(user.user_id)}
                            >
                              Approve
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>

                  </table>
                </div>
              )}

            </section>
          </>
        )}

        {/* MANAGE USERS */}
        {activeTab === "users" && (
          <section className="admin-panel page-panel">

            <h1>Manage Users</h1>

            <p>
              Registered TrustVault users and account status.
            </p>

            <div className="admin-table-wrapper">
              <table className="admin-table">

                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.full_name || "-"}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>
                        {user.is_active ? "Active" : "Inactive"}
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>

          </section>
        )}

        {/* DOCUMENTS */}
        {activeTab === "documents" && (
          <section className="admin-panel page-panel">

            <div className="admin-documents-heading">
              <div>
                <h1>Documents</h1>

                <p>
                  Documents stored in TrustVault.
                </p>
              </div>

              <button
                className="admin-upload-button"
                onClick={() => setShowUpload(true)}
              >
                ＋ Upload Document
              </button>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">

                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Category</th>
                    <th>Owner</th>
                    <th>Created</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDocuments.length === 0 ? (
                    <tr>
                      <td colSpan="4">
                        <p className="admin-empty">
                          No documents found.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredDocuments.map((doc, index) => (
                      <tr
                        key={
                          doc.document_id ||
                          doc.id ||
                          index
                        }
                      >
                        <td>
                          {doc.title ||
                            doc.original_filename ||
                            doc.filename ||
                            "-"}
                        </td>

                        <td>{doc.category || "-"}</td>

                        <td>
                          {doc.owner_id ||
                            doc.owner_email ||
                            "-"}
                        </td>

                        <td>
                          {formatDate(doc.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

              </table>
            </div>

          </section>
        )}

        {/* AUDIT LOGS */}
        {activeTab === "activity" && (
          <section className="admin-panel page-panel">

            <h1>Audit Logs</h1>

            <p>
              Review recorded TrustVault activities.
            </p>

            <div className="admin-table-wrapper">
              <table className="admin-table">

                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Outcome</th>
                    <th>Actor</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLogs.map((log, index) => (
                    <tr key={log.id || index}>
                      <td>{log.action || "-"}</td>
                      <td>{log.outcome || "-"}</td>
                      <td>{log.actor_id || "-"}</td>
                      <td>{formatDate(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>

          </section>
        )}

        {/* REPORTS */}
        {activeTab === "reports" && (
          <section className="admin-panel page-panel">

            <h1>Reports</h1>

            <p>
              Summary based on the records currently loaded from TrustVault.
            </p>

            <div className="report-grid">
              <div>
                <span>Total Users</span>
                <h2>{users.length}</h2>
              </div>

              <div>
                <span>Active Users</span>
                <h2>{activeUsers}</h2>
              </div>

              <div>
                <span>Total Documents</span>
                <h2>{documents.length}</h2>
              </div>

              <div>
                <span>Permissions</span>
                <h2>{permissions.length}</h2>
              </div>

              <div>
                <span>Audit Records</span>
                <h2>{logs.length}</h2>
              </div>

              <div>
                <span>Security Events</span>
                <h2>{deniedEvents.length}</h2>
              </div>
            </div>

          </section>
        )}

        {/* SETTINGS */}
        {activeTab === "settings" && (
          <section className="admin-panel page-panel">

            <h1>Settings</h1>

            <p>
              Administrator account information.
            </p>

            <div className="settings-information">
              <p>
                <strong>Name:</strong>{" "}
                {storedUser.full_name || "-"}
              </p>

              <p>
                <strong>Email:</strong>{" "}
                {storedUser.email || "-"}
              </p>

              <p>
                <strong>Role:</strong>{" "}
                {storedUser.role || "Admin"}
              </p>
            </div>

            <div className="security-check">
              <div>
                <h3>Audit Chain Integrity</h3>

                <p>
                  Check the integrity of recorded audit events.
                </p>
              </div>

              <button onClick={verifyAudit}>
                Verify Integrity
              </button>
            </div>

            {verification && (
              <pre className="verification-result">
                {JSON.stringify(verification, null, 2)}
              </pre>
            )}

          </section>
        )}

        <footer className="admin-footer">
          TrustVault · Secure Document Management
        </footer>

      </main>

      {/* UPLOAD DOCUMENT MODAL */}
      {showUpload && (
        <div
          className="admin-upload-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeUpload();
            }
          }}
        >
          <section
            className="admin-upload-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-upload-title"
          >

            <div className="admin-upload-heading">
              <h2 id="admin-upload-title">
                Upload Document
              </h2>

              <button
                type="button"
                onClick={closeUpload}
                disabled={uploading}
                aria-label="Close upload window"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpload}>

              {/* DRAG AND DROP AREA */}
              <div
                className={`admin-drop-zone ${
                  isDragging ? "dragging" : ""
                } ${uploadFile ? "selected" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);

                  handleFileSelect(
                    e.dataTransfer.files?.[0]
                  );
                }}
              >

                <input
                  id="admin-document-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.txt"
                  onChange={(e) => {
                    handleFileSelect(
                      e.target.files?.[0]
                    );
                  }}
                  aria-label="Choose document"
                />

                <div className="admin-upload-icon">
                  ⇧
                </div>

                <strong>
                  {uploadFile
                    ? "Document selected"
                    : "Drag and drop your file here"}
                </strong>

                <span>
                  {uploadFile
                    ? uploadFile.name
                    : "or click below to browse your computer"}
                </span>

                {uploadFile && (
                  <small>
                    {formatSize(uploadFile.size)}
                  </small>
                )}

                <label
                  htmlFor="admin-document-file"
                  className="admin-browse-button"
                >
                  Browse files
                </label>

                <small>
                  PDF, JPG, PNG or TXT · Maximum 5 MB
                </small>

              </div>

              {/* UPLOAD FIELDS */}
              <div className="admin-upload-fields">

                <label>
                  Document title

                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) =>
                      setUploadTitle(e.target.value)
                    }
                    placeholder="Enter document title"
                    maxLength={200}
                    required
                  />
                </label>

                <label>
                  Category

                  <select
                    value={uploadCategory}
                    onChange={(e) =>
                      setUploadCategory(e.target.value)
                    }
                  >
                    <option value="General">General</option>
                    <option value="Contracts">Contracts</option>
                    <option value="Salary Letters">
                      Salary Letters
                    </option>
                    <option value="Reports">Reports</option>
                    <option value="Education">Education</option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                <label className="admin-description-field">
                  Description (Optional)

                  <textarea
                    value={uploadDescription}
                    onChange={(e) =>
                      setUploadDescription(e.target.value)
                    }
                    placeholder="Enter description..."
                    maxLength={5000}
                    rows="3"
                  />
                </label>

              </div>

              <div className="admin-permission-notice">
                <strong>Secure document storage</strong>

                <p>
                  Document access is controlled by the existing
                  TrustVault permission system. Only authorized
                  users can access documents.
                </p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="admin-upload-actions">

                <button
                  type="button"
                  className="admin-cancel-upload"
                  onClick={closeUpload}
                  disabled={uploading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-submit-upload"
                  disabled={uploading}
                >
                  {uploading
                    ? "Uploading..."
                    : "Upload Document"}
                </button>

              </div>

            </form>

          </section>
        </div>
      )}

    </div>
  );
}

export default AdminDashboard;
