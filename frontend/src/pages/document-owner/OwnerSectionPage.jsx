
import { useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import Sidebar from "../../components/common/Sidebar";
import "./OwnerSectionPage.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

function OwnerSectionPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");

  const [documents, setDocuments] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsError, setPermissionsError] = useState("");

  const [selectedDocument, setSelectedDocument] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [permissionType, setPermissionType] = useState("read");
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantMessage, setGrantMessage] = useState("");
  const [grantError, setGrantError] = useState("");
  const [revokingId, setRevokingId] = useState("");

  // Settings profile states
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  const userId = user?.id || user?.user_id;

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // Common API request helper
  const apiRequest = async (url, options = {}) => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      throw new Error("Authentication required. Please log in again.");
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers
      }
    });

    if (!response.ok) {
      let message = "Something went wrong.";

      try {
        const data = await response.json();
        message = data.detail || message;
      } catch {
        // Keep default error message
      }

      if (response.status === 401) {
        throw new Error("Session expired. Please log in again.");
      }

      throw new Error(message);
    }

    return response.json();
  };

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    setAuditError("");

    try {
      const data = await apiRequest(
        "/owner/audit/?limit=50&offset=0"
      );

      setAuditLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setAuditError(err.message);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  // Fetch documents and owner permissions
  const fetchPermissions = useCallback(async () => {
    setPermissionsLoading(true);
    setPermissionsError("");

    try {
      const [documentData, permissionData] = await Promise.all([
        apiRequest("/documents/"),
        apiRequest("/permissions/owner")
      ]);

      const ownedDocuments = (
        Array.isArray(documentData) ? documentData : []
      ).filter(
        (document) =>
          String(document.owner_id) === String(userId)
      );

      setDocuments(ownedDocuments);

      setPermissions(
        Array.isArray(permissionData.permissions)
          ? permissionData.permissions
          : []
      );

      setSelectedDocument((previous) => {
        if (
          previous &&
          ownedDocuments.some(
            (document) => document.document_id === previous
          )
        ) {
          return previous;
        }

        return ownedDocuments[0]?.document_id || "";
      });
    } catch (err) {
      setPermissionsError(err.message);
    } finally {
      setPermissionsLoading(false);
    }
  }, [userId]);

  // Existing page data loading
  useEffect(() => {
    if (location.pathname === "/owner/audit") {
      fetchAuditLogs();
    }

    if (location.pathname === "/owner/permissions") {
      fetchPermissions();
    }
  }, [
    location.pathname,
    fetchAuditLogs,
    fetchPermissions
  ]);

  // Fetch current account profile
  useEffect(() => {
    if (location.pathname !== "/owner/settings") {
      return;
    }

    let isActive = true;

    const fetchProfile = async () => {
      setProfileLoading(true);
      setProfileError("");

      try {
        const data = await apiRequest("/auth/me");

        if (isActive) {
          setProfile(data);
        }
      } catch (err) {
        if (isActive) {
          setProfileError(err.message);
        }
      } finally {
        if (isActive) {
          setProfileLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isActive = false;
    };
  }, [location.pathname]);

  // Grant document access
  const handleGrantPermission = async (event) => {
    event.preventDefault();

    setGrantMessage("");
    setGrantError("");

    if (!selectedDocument) {
      setGrantError("Please select a document.");
      return;
    }

    if (!recipientEmail.trim()) {
      setGrantError("Please enter the recipient email.");
      return;
    }

    setGrantLoading(true);

    try {
      const data = await apiRequest(
        `/permissions/${selectedDocument}/grant`,
        {
          method: "POST",
          body: JSON.stringify({
            user_email: recipientEmail.trim().toLowerCase(),
            permission: permissionType
          })
        }
      );

      setGrantMessage(
        data.message || "Permission granted successfully."
      );

      setRecipientEmail("");
      setPermissionType("read");

      await fetchPermissions();
    } catch (err) {
      setGrantError(err.message);
    } finally {
      setGrantLoading(false);
    }
  };

  // Revoke document access
  const handleRevokePermission = async (permission) => {
    const confirmed = window.confirm(
      `Are you sure you want to revoke access for ${permission.user_email}?`
    );

    if (!confirmed) return;

    const key = `${permission.document_id}-${permission.user_id}`;

    setRevokingId(key);
    setPermissionsError("");

    try {
      await apiRequest(
        `/permissions/${permission.document_id}/revoke/${permission.user_id}`,
        {
          method: "DELETE"
        }
      );

      await fetchPermissions();
    } catch (err) {
      setPermissionsError(err.message);
    } finally {
      setRevokingId("");
    }
  };

  const pages = {
    "/owner/permissions": {
      title: "Permissions",
      description: "Manage and review document access permissions."
    },
    "/owner/audit": {
      title: "Audit Logs",
      description:
        "Review security activity related to your document workspace."
    },
    "/owner/settings": {
      title: "Settings",
      description: "Manage and review your account information."
    }
  };

  const page =
    pages[location.pathname] || pages["/owner/settings"];

  const formatDate = (date) => {
    if (!date) return "Not available";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Invalid date";
    }

    return parsedDate.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  const getActor = (actorId) => {
    if (!actorId) return "System";

    if (String(actorId) === String(userId)) return "You";

    return `User ${String(actorId).slice(0, 8)}`;
  };

  const formatRole = (role) => {
    if (!role) return "Document Owner";

    return role
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  return (
    <div className="owner-section-layout">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="owner-section-main">
        <header className="owner-section-header">
          <div>
            <h1>{page.title}</h1>
            <p>{page.description}</p>
          </div>
        </header>

        {/* PERMISSIONS PAGE */}
        {location.pathname === "/owner/permissions" && (
          <section className="owner-permissions-section">

            <div className="owner-permissions-toolbar">
              <div>
                <h2>Document Permissions</h2>
                <p>
                  Control who can access your documents.
                </p>
              </div>

              <button
                className="audit-refresh-button"
                onClick={fetchPermissions}
                disabled={permissionsLoading}
              >
                {permissionsLoading ? "Refreshing..." : "↻ Refresh"}
              </button>
            </div>

            <div className="audit-summary">
              <div className="audit-summary-card">
                <span>Total Permissions</span>
                <strong>{permissions.length}</strong>
              </div>

              <div className="audit-summary-card">
                <span>Active Access</span>
                <strong className="success-number">
                  {permissions.filter(
                    (item) => item.status === "Active"
                  ).length}
                </strong>
              </div>

              <div className="audit-summary-card">
                <span>Revoked Access</span>
                <strong className="denied-number">
                  {permissions.filter(
                    (item) => item.status === "Revoked"
                  ).length}
                </strong>
              </div>
            </div>

            {/* GRANT ACCESS FORM */}
            <div className="owner-section-card permission-form-card">
              <h2>Grant Document Access</h2>

              <p>
                Share one of your documents with another registered user.
              </p>

              {documents.length === 0 && !permissionsLoading && (
                <div className="audit-empty">
                  No documents owned by your account are available.
                </div>
              )}

              <form
                className="permission-form"
                onSubmit={handleGrantPermission}
              >
                <div className="permission-form-group">
                  <label htmlFor="permission-document">
                    Select Document
                  </label>

                  <select
                    id="permission-document"
                    value={selectedDocument}
                    onChange={(event) =>
                      setSelectedDocument(event.target.value)
                    }
                    required
                    disabled={documents.length === 0}
                  >
                    <option value="">Choose a document</option>

                    {documents.map((document) => (
                      <option
                        key={document.document_id}
                        value={document.document_id}
                      >
                        {document.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="permission-form-group">
                  <label htmlFor="recipient-email">
                    Recipient Email
                  </label>

                  <input
                    id="recipient-email"
                    type="email"
                    placeholder="Enter registered user email"
                    value={recipientEmail}
                    onChange={(event) =>
                      setRecipientEmail(event.target.value)
                    }
                    required
                  />
                </div>

                <div className="permission-form-group">
                  <label htmlFor="permission-type">
                    Access Permission
                  </label>

                  <select
                    id="permission-type"
                    value={permissionType}
                    onChange={(event) =>
                      setPermissionType(event.target.value)
                    }
                  >
                    <option value="read">Read Only</option>
                    <option value="edit">Edit Access</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="permission-grant-button"
                  disabled={
                    grantLoading ||
                    documents.length === 0 ||
                    permissionsLoading
                  }
                >
                  {grantLoading ? "Granting..." : "Grant Access"}
                </button>
              </form>

              {grantMessage && (
                <div className="permission-success-message">
                  {grantMessage}
                </div>
              )}

              {grantError && (
                <div className="audit-error">
                  {grantError}
                </div>
              )}
            </div>

            {/* PERMISSION TABLE */}
            <div className="owner-section-card permission-list-card">
              <h2>Shared Document Access</h2>

              <p>
                Review users who have received access to your documents.
              </p>

              {permissionsLoading && (
                <div className="audit-message">
                  Loading permissions...
                </div>
              )}

              {permissionsError && (
                <div className="audit-error">
                  {permissionsError}
                </div>
              )}

              {!permissionsLoading &&
                !permissionsError &&
                permissions.length === 0 && (
                  <div className="audit-empty">
                    <h3>No Permissions Found</h3>
                    <p>
                      Permissions granted for your documents will appear here.
                    </p>
                  </div>
                )}

              {!permissionsLoading &&
                !permissionsError &&
                permissions.length > 0 && (
                  <div className="owner-audit-table-wrapper">
                    <table className="owner-audit-table">
                      <thead>
                        <tr>
                          <th>Document</th>
                          <th>Recipient</th>
                          <th>Email</th>
                          <th>Access</th>
                          <th>Status</th>
                          <th>Granted On</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {permissions.map((item) => {
                          const key =
                            `${item.document_id}-${item.user_id}`;

                          return (
                            <tr key={key}>
                              <td>
                                <strong className="audit-document-title">
                                  {item.document_title}
                                </strong>
                              </td>

                              <td>{item.user_name}</td>

                              <td>{item.user_email}</td>

                              <td>
                                {item.permission === "read"
                                  ? "Read Only"
                                  : "Edit"}
                              </td>

                              <td>
                                <span
                                  className={`audit-status ${
                                    item.status === "Active"
                                      ? "status-success"
                                      : "status-denied"
                                  }`}
                                >
                                  {item.status}
                                </span>
                              </td>

                              <td className="audit-date">
                                {formatDate(item.created_at)}
                              </td>

                              <td>
                                {item.status === "Active" ? (
                                  <button
                                    className="permission-revoke-button"
                                    onClick={() =>
                                      handleRevokePermission(item)
                                    }
                                    disabled={revokingId === key}
                                  >
                                    {revokingId === key
                                      ? "Revoking..."
                                      : "Revoke"}
                                  </button>
                                ) : (
                                  <span className="permission-revoked-label">
                                    Revoked
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          </section>
        )}

        {/* AUDIT LOGS PAGE */}
        {location.pathname === "/owner/audit" && (
          <section className="owner-audit-section">
            <div className="owner-audit-toolbar">
              <div>
                <h2>Security Activity</h2>
                <p>
                  Track activities performed on your documents.
                </p>
              </div>

              <button
                className="audit-refresh-button"
                onClick={fetchAuditLogs}
                disabled={auditLoading}
              >
                {auditLoading ? "Refreshing..." : "↻ Refresh"}
              </button>
            </div>

            <div className="audit-summary">
              <div className="audit-summary-card">
                <span>Total Activities</span>
                <strong>{auditLogs.length}</strong>
              </div>

              <div className="audit-summary-card">
                <span>Successful</span>
                <strong className="success-number">
                  {auditLogs.filter(
                    (log) => log.outcome === "SUCCESS"
                  ).length}
                </strong>
              </div>

              <div className="audit-summary-card">
                <span>Denied</span>
                <strong className="denied-number">
                  {auditLogs.filter(
                    (log) => log.outcome === "DENIED"
                  ).length}
                </strong>
              </div>
            </div>

            {auditLoading && (
              <div className="audit-message">
                Loading audit records...
              </div>
            )}

            {auditError && (
              <div className="audit-error">{auditError}</div>
            )}

            {!auditLoading &&
              !auditError &&
              auditLogs.length === 0 && (
                <div className="audit-empty">
                  <h3>No Audit Records Found</h3>
                  <p>
                    Activities related to your documents will appear here.
                  </p>
                </div>
              )}

            {!auditLoading &&
              !auditError &&
              auditLogs.length > 0 && (
                <div className="owner-audit-table-wrapper">
                  <table className="owner-audit-table">
                    <thead>
                      <tr>
                        <th>Activity</th>
                        <th>Document</th>
                        <th>Performed By</th>
                        <th>Status</th>
                        <th>Date &amp; Time</th>
                        <th>Details</th>
                      </tr>
                    </thead>

                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td>
                            <strong className="audit-action">
                              {log.action.replaceAll("_", " ")}
                            </strong>
                          </td>

                          <td>
                            <span className="audit-document-title">
                              {log.document_title || "Unknown document"}
                            </span>
                          </td>

                          <td>{getActor(log.actor_id)}</td>

                          <td>
                            <span
                              className={`audit-status ${
                                log.outcome === "SUCCESS"
                                  ? "status-success"
                                  : "status-denied"
                              }`}
                            >
                              {log.outcome}
                            </span>
                          </td>

                          <td className="audit-date">
                            {formatDate(log.created_at)}
                          </td>

                          <td className="audit-details">
                            {log.details || "No additional details"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </section>
        )}

        {/* SETTINGS PAGE */}
        {location.pathname === "/owner/settings" && (
          <section className="owner-settings-section">

            {profileLoading && (
              <div className="owner-section-card">
                Loading account information...
              </div>
            )}

            {profileError && (
              <div className="audit-error">
                {profileError}
              </div>
            )}

            {!profileLoading && !profileError && profile && (
              <>
                {/* PROFILE HEADER */}
                <div className="owner-section-card owner-profile-card">
                  <div className="owner-profile-header">

                    <div className="owner-profile-avatar">
                      {(profile.full_name || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="owner-profile-details">
                      <h2>{profile.full_name || "User"}</h2>
                      <p>{profile.email}</p>

                      <span className="owner-role-badge">
                        {formatRole(profile.role)}
                      </span>
                    </div>

                    <div className="owner-profile-status">
                      <span
                        className={
                          profile.is_active
                            ? "owner-status-dot active"
                            : "owner-status-dot inactive"
                        }
                      ></span>

                      {profile.is_active ? "Active Account" : "Inactive Account"}
                    </div>

                  </div>
                </div>

                {/* ACCOUNT INFORMATION */}
                <div className="owner-section-card owner-settings-card">

                  <div className="owner-settings-card-heading">
                    <div className="owner-settings-icon">01</div>

                    <div>
                      <h2>Account Information</h2>
                      <p>Personal details associated with your account.</p>
                    </div>
                  </div>

                  <div className="owner-setting-row">
                    <div>
                      <span>Full Name</span>
                      <strong>{profile.full_name || "Not available"}</strong>
                    </div>
                    <span className="owner-detail-label">Profile</span>
                  </div>

                  <div className="owner-setting-row">
                    <div>
                      <span>Email Address</span>
                      <strong>{profile.email || "Not available"}</strong>
                    </div>
                    <span className="owner-detail-label">Registered Email</span>
                  </div>

                  <div className="owner-setting-row">
                    <div>
                      <span>Account Role</span>
                      <strong>{formatRole(profile.role)}</strong>
                    </div>
                    <span className="owner-detail-label">Access Level</span>
                  </div>

                  <div className="owner-setting-row">
                    <div>
                      <span>Account Status</span>
                      <strong className={
                        profile.is_active
                          ? "success-number"
                          : "denied-number"
                      }>
                        {profile.is_active ? "Active" : "Inactive"}
                      </strong>
                    </div>
                    <span className="owner-detail-label">Current Status</span>
                  </div>

                </div>

                {/* ACCOUNT SECURITY */}
                <div className="owner-section-card owner-settings-card">

                  <div className="owner-settings-card-heading">
                    <div className="owner-settings-icon">02</div>

                    <div>
                      <h2>Account Security</h2>
                      <p>Security information for your TrustVault account.</p>
                    </div>
                  </div>

                  <div className="owner-setting-row">
                    <div>
                      <span>Authentication Method</span>
                      <strong>Secure Bearer Token</strong>
                    </div>
                    <span className="owner-detail-label">Authentication</span>
                  </div>

                  <div className="owner-setting-row">
                    <div>
                      <span>Profile Verification</span>
                      <strong>Verified</strong>
                    </div>
                    <span className="owner-detail-label">Account Access</span>
                  </div>

                </div>
              </>
            )}

          </section>
        )}
      </main>
    </div>
  );
}

export default OwnerSectionPage;
