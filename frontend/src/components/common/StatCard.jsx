function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  accent = "cyan"
}) {
  return (
    <article className={`tv-stat-card tv-stat-${accent}`}>
      <div className="tv-stat-top">
        <div className="tv-stat-icon">{icon}</div>
        {trend && <span className="tv-stat-trend">{trend}</span>}
      </div>

      <div className="tv-stat-value">{value ?? "—"}</div>

      <div className="tv-stat-title">{title}</div>

      {subtitle && (
        <div className="tv-stat-subtitle">{subtitle}</div>
      )}
    </article>
  );
}

export default StatCard;