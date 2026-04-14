/** Distance in meters → `412m` or `12.4km`. */
export function formatDistance(meters: number | null): string {
  if (meters == null || !Number.isFinite(meters)) {
    return "—";
  }
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

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

function startOfLocalDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Parse `YYYY-MM-DD` as a local calendar day (noon anchor avoids DST edge issues). */
export function parseLocalDateString(ymd: string): Date {
  const parts = ymd.split("-").map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return new Date(NaN);
  }
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/** Shift a local calendar `YYYY-MM-DD` by `delta` days. */
/** Inclusive range of local calendar days from `startYmd` through `endYmd` (both `YYYY-MM-DD`). */
export function enumerateCalendarDays(startYmd: string, endYmd: string): string[] {
  if (startYmd > endYmd) {
    return [];
  }
  const out: string[] = [];
  let d = startYmd;
  for (;;) {
    out.push(d);
    if (d >= endYmd) {
      break;
    }
    d = addCalendarDays(d, 1);
  }
  return out;
}

export function addCalendarDays(ymd: string, delta: number): string {
  const d = parseLocalDateString(ymd);
  if (Number.isNaN(d.getTime())) {
    return ymd;
  }
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Short label for a dashboard/log calendar day (Today / Yesterday / Mon, Apr 14). */
export function formatDashboardDayLabel(ymd: string): string {
  const d = parseLocalDateString(ymd);
  if (Number.isNaN(d.getTime())) {
    return ymd;
  }
  const t0 = startOfLocalDayMs(new Date());
  const d0 = startOfLocalDayMs(d);
  const diffDays = Math.round((t0 - d0) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
