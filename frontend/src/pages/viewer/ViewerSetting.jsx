
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/common/Sidebar";
import "./ViewerSetting.css";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function ViewerSettings() {
  const navigate = useNavigate();
  const user = getStoredUser();

  const displayName =
    user.full_name ||
    user.name ||
    "Viewer";

  const email = user.email || "Not available";
  const role = (user.role || "viewer").replace(/_/g, " ");

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="viewer-settings-layout">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="viewer-settings-main">
        <header className="viewer-settings-header">
          <div>
            <p className="viewer-settings-eyebrow">ACCOUNT</p>
            <h1>Settings</h1>
            <p>View your TrustVault account information.</p>
          </div>
        </header>

        <section className="viewer-settings-card">
          <div className="viewer-settings-profile">
            <div className="viewer-settings-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div>
              <h2>{displayName}</h2>
              <span className="viewer-settings-role">
                {role}
              </span>
            </div>
          </div>

          <div className="viewer-settings-divider" />

          <h3>Personal Information</h3>

          <div className="viewer-settings-info-grid">
            <div className="viewer-settings-info">
              <span>Full Name</span>
              <strong>{displayName}</strong>
            </div>

            <div className="viewer-settings-info">
              <span>Email Address</span>
              <strong>{email}</strong>
            </div>

            <div className="viewer-settings-info">
              <span>Account Role</span>
              <strong>{role}</strong>
            </div>

            <div className="viewer-settings-info">
              <span>Account Status</span>
              <strong className="viewer-settings-status">
                Active
              </strong>
            </div>
          </div>

          <div className="viewer-settings-note">
            <span>🔒</span>
            <p>
              Your account information is displayed here.
              Contact your administrator if you need to
              update your account details.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ViewerSettings;
