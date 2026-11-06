import "./Header.css";

function Header({
  user,
  searchValue = "",
  onSearch,
  searchPlaceholder = "Search documents...",
  onLogout,
  notificationCount = 0
}) {
  const displayName =
    user?.full_name ||
    user?.name ||
    user?.email ||
    "User";

  return (
    <header className="tv-header">

      {/* SEARCH BAR */}

      <div className="tv-header-search">
        <span className="tv-search-icon">⌕</span>

        <input
          type="search"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(event) =>
            onSearch?.(event.target.value)
          }
          aria-label="Search"
        />
      </div>

      {/* HEADER ACTIONS */}

      <div className="tv-header-actions">

        <div className="tv-security-status">
          <span className="tv-status-dot"></span>
          Secure Session
        </div>

        <button
          type="button"
          className="tv-notification-button"
          aria-label="Notifications"
          title="Notifications"
        >
          ♧

          {notificationCount > 0 && (
            <span className="tv-notification-badge">
              {notificationCount}
            </span>
          )}
        </button>

        <div className="tv-header-user">
          {displayName}
        </div>

        <button
          type="button"
          className="tv-header-logout"
          onClick={onLogout}
        >
          Logout
        </button>

      </div>

    </header>
  );
}

export default Header;