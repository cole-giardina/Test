import * as AuthSession from "expo-auth-session";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { supabase } from "@/lib/supabase";

const STRAVA_AUTHORIZE = "https://www.strava.com/oauth/authorize";

export function hasStravaConfig(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID?.trim());
}

export function getStravaRedirectUri(): string {
  return AuthSession.makeRedirectUri({
    scheme: "cirque",
    path: "strava",
  });
}

export function buildStravaAuthorizeUrl(redirectUri: string): string {
  const clientId = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error(
      "Set EXPO_PUBLIC_STRAVA_CLIENT_ID in .env.local for Strava (create an API application at strava.com/settings/api).",
    );
  }
  const u = new URL(STRAVA_AUTHORIZE);
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("approval_prompt", "auto");
  u.searchParams.set("scope", "activity:read_all");
  return u.toString();
}

export type StravaSyncResult = {
  synced: number;
  skipped: number;
  errors: number;
};

/**
 * Opens Strava OAuth in an in-app browser session, exchanges the code via Edge Function, and stores tokens server-side.
 */
export async function connectStravaAccount(): Promise<void> {
  WebBrowser.maybeCompleteAuthSession();

  const redirectUri = getStravaRedirectUri();
  const authUrl = buildStravaAuthorizeUrl(redirectUri);

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type !== "success" || !("url" in result) || !result.url) {
    throw new Error("Strava login was cancelled.");
  }

  const parsed = Linking.parse(result.url);
  const err = parsed.queryParams?.error;
  if (err) {
    throw new Error(
      typeof err === "string" ? err : "Strava authorization failed.",
    );
  }
  const codeRaw = parsed.queryParams?.code;
  const code = Array.isArray(codeRaw) ? codeRaw[0] : codeRaw;
  if (!code || typeof code !== "string") {
    throw new Error("Missing Strava authorization code.");
  }

  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    error?: string;
  }>("strava-token-exchange", {
    body: { code, redirect_uri: redirectUri },
  });

  if (error) {
    throw new Error(error.message ?? "Strava token exchange failed.");
  }
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }
}

/**
 * Pulls recent Strava activities into `workouts` (deduped by `raw_data.id`) via Edge Function.
 */
export async function syncStravaWorkouts(): Promise<StravaSyncResult> {
  const { data, error } = await supabase.functions.invoke<StravaSyncResult & {
    error?: string;
  }>("strava-sync", {
    body: {},
  });

  if (error) {
    throw new Error(error.message ?? "Strava sync failed.");
  }
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }
  if (
    !data ||
    typeof data.synced !== "number" ||
    typeof data.skipped !== "number" ||
    typeof data.errors !== "number"
  ) {
    throw new Error("Unexpected Strava sync response.");
  }

  return {
    synced: data.synced,
    skipped: data.skipped,
    errors: data.errors,
  };
}
