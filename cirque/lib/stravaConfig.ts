/**
 * Strava env flags only — no native modules so any screen can import safely.
 */
export function hasStravaConfig(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID?.trim());
}
