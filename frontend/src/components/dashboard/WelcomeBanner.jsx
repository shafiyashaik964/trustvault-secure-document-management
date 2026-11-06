function WelcomeBanner({ user, role }) {
  const name =
    user?.full_name ||
    user?.name ||
    user?.email?.split("@")[0] ||
    "User";

  const roleLabel = {
    admin: "Administrator",
    document_owner: "Document Owner",
    viewer: "Viewer"
  };

  return (
    <section className="tv-welcome-banner">
      <div>
        <span className="tv-welcome-eyebrow">
          TRUSTVAULT SECURE WORKSPACE
        </span>

        <h1>Welcome back, {name}!</h1>

        <p>
          Manage your secure documents and monitor your workspace.
        </p>

        <span className="tv-role-badge">
          {roleLabel[role] || "User"}
        </span>
      </div>

      <div className="tv-welcome-decoration" aria-hidden="true">
        <div className="tv-shield">◆</div>
      </div>
    </section>
  );
}

export default WelcomeBanner;