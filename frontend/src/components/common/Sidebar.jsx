
import { useNavigate, useLocation } from "react-router-dom";
import "./Sidebar.css";

function Sidebar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const role = user?.role || "viewer";

  const displayName =
    user?.full_name ||
    user?.name ||
    user?.email ||
    "User";

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  const isAdmin = role === "admin";
  const isOwner = role === "document_owner";

  const homePath = isAdmin
    ? "/admin"
    : isOwner
    ? "/document-owner"
    : "/viewer";

  const navigation = isAdmin
    ? [
        { label: "Dashboard", icon: "⌂", path: "/admin" },
        { label: "Users", icon: "♙", path: "/admin/users" },
        { label: "Documents", icon: "▤", path: "/admin/documents" },
        { label: "Permissions", icon: "♧", path: "/admin/permissions" },
        { label: "Audit Logs", icon: "▣", path: "/audit" },
        { label: "Security Alerts", icon: "⚠", path: "/admin/security" },
        { label: "Reports", icon: "▥", path: "/admin/reports" },
        { label: "Settings", icon: "⚙", path: "/admin/settings" }
      ]
    : isOwner
    ? [
        { label: "Dashboard", icon: "⌂", path: "/document-owner" },
        { label: "My Documents", icon: "▤", path: "/documents" },
        { label: "Shared With Me", icon: "⇄", path: "/shared" },
        { label: "Permissions", icon: "♧", path: "/owner/permissions" },
        { label: "Audit Logs", icon: "▣", path: "/owner/audit" },
        { label: "Settings", icon: "⚙", path: "/owner/settings" }
      ]
    : [
        { label: "Dashboard", icon: "⌂", path: "/viewer" },
        { label: "My Documents", icon: "▤", path: "/documents" },
        { label: "Shared With Me", icon: "⇄", path: "/shared" },
        { label: "Settings", icon: "⚙", path: "/viewer/settings" }
      ];

  return (
    <aside className="tv-sidebar">
      <div
        className="tv-brand"
        onClick={() => navigate(homePath)}
        role="button"
      >
        <span className="tv-brand-mark">T</span>
        <span>
          Trust<span>Vault</span>
        </span>
      </div>

      <div className="tv-side-label">MAIN MENU</div>

      <nav className="tv-nav">
        {navigation.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== homePath &&
              location.pathname.startsWith(item.path + "/"));

          return (
            <button
              key={item.path}
              type="button"
              className={isActive ? "active" : ""}
              onClick={() => navigate(item.path)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="tv-sidebar-bottom">
        <div className="tv-avatar">{initials || "U"}</div>

        <div className="tv-user-meta">
          <strong>{displayName}</strong>
          <span>{role.replace(/_/g, " ")}</span>
        </div>

        {(isAdmin || isOwner) && (
          <button
            type="button"
            className="tv-logout-mobile"
            onClick={onLogout}
            title="Logout"
          >
            ↗
          </button>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
