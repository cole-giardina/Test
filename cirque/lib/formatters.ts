/** Format duration in seconds as "1h 24m" or "45m" or "0m". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0m";
  }
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${m}m`;
}

/**
 * Relative day label for a calendar day in local time.
 * ISO date string from DB → "Today" | "Yesterday" | "Mon" etc.
 */
export function formatDate(dateString: string): string {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const d0 = startOfDay(d);
  const now = new Date();
  const t0 = startOfDay(now);
  const diffDays = Math.round((t0 - d0) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 0) {
    return d.toLocaleDateString("en-US", { weekday: "short" });
  }
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) {
    return "Good morning";
  }
  if (h < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

/** First word of display name, or empty string. */
export function formatFirstName(displayName: string): string {
  const t = displayName.trim();
  if (!t) {
    return "";
  }
  return t.split(/\s+/)[0] ?? t;
}

/** Local calendar date as YYYY-MM-DD. */
export function getTodayDateString(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
