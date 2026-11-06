import "./RecentActivity.css";

function RecentActivity({ activities = [], loading = false }) {
  return (
    <section className="tv-activity-panel">

      <div className="tv-activity-heading">
        <div>
          <span className="tv-activity-eyebrow">WORKSPACE HISTORY</span>
          <h2>Recent Activity</h2>
        </div>
      </div>

      {loading ? (
        <p className="tv-activity-empty">Loading activity...</p>
      ) : activities.length === 0 ? (
        <div className="tv-activity-empty">
          <span className="tv-activity-empty-icon">◷</span>
          <strong>No recent activity available</strong>
          <p>
            Activity records will appear here when the connected
            audit or activity service provides them.
          </p>
        </div>
      ) : (
        <div className="tv-activity-list">
          {activities.map((activity, index) => (
            <article
              className="tv-activity-item"
              key={activity.id || activity.event_id || index}
            >
              <div className="tv-activity-icon">✓</div>

              <div className="tv-activity-details">
                <strong>
                  {activity.action || activity.event_type || "Activity"}
                </strong>

                <span>
                  {activity.description ||
                    activity.document_name ||
                    "Document activity"}
                </span>
              </div>

              <time>
                {activity.created_at
                  ? new Date(activity.created_at).toLocaleString()
                  : "—"}
              </time>
            </article>
          ))}
        </div>
      )}

    </section>
  );
}

export default RecentActivity;