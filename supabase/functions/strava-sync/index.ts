import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

type StravaActivity = {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  start_date: string;
  calories?: number;
  average_heartrate?: number;
  type?: string;
};

type StravaTokenRefresh = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

async function refreshStravaToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<StravaTokenRefresh | null> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    console.error("[strava-sync] refresh failed", await res.text());
    return null;
  }
  return (await res.json()) as StravaTokenRefresh;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError || !profile?.id) {
    return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: conn, error: connError } = await admin
    .from("strava_connections")
    .select("*")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (connError || !conn?.access_token) {
    return new Response(JSON.stringify({ error: "Strava not connected" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let accessToken = conn.access_token as string;
  let refreshToken = conn.refresh_token as string | null;
  const expiresAt = conn.expires_at ? new Date(conn.expires_at as string) : null;
  const clientId = Deno.env.get("STRAVA_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("STRAVA_CLIENT_SECRET") ?? "";

  if (expiresAt && expiresAt.getTime() < Date.now() + 60_000 && refreshToken && clientId && clientSecret) {
    const refreshed = await refreshStravaToken(refreshToken, clientId, clientSecret);
    if (refreshed) {
      accessToken = refreshed.access_token;
      refreshToken = refreshed.refresh_token;
      const newExpires = new Date(refreshed.expires_at * 1000).toISOString();
      await admin
        .from("strava_connections")
        .update({
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: newExpires,
          updated_at: new Date().toISOString(),
        })
        .eq("profile_id", profile.id);
    }
  }

  const activitiesRes = await fetch(
    "https://www.strava.com/api/v3/athlete/activities?per_page=50",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!activitiesRes.ok) {
    const t = await activitiesRes.text();
    console.error("[strava-sync] activities", activitiesRes.status, t);
    return new Response(JSON.stringify({ error: "Could not load Strava activities" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const activities = (await activitiesRes.json()) as StravaActivity[];

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (const a of activities) {
    const { data: existing } = await admin
      .from("workouts")
      .select("id")
      .eq("user_id", profile.id)
      .eq("source", "strava")
      .contains("raw_data", { id: a.id })
      .limit(1)
      .maybeSingle();

    if (existing) {
      skipped += 1;
      continue;
    }

    const { error: insertError } = await admin.from("workouts").insert({
      user_id: profile.id,
      source: "strava",
      activity_type: a.type ?? a.name ?? "Workout",
      duration_seconds: a.moving_time,
      distance_meters: a.distance,
      calories_burned: a.calories ?? null,
      avg_heart_rate:
        a.average_heartrate != null && Number.isFinite(a.average_heartrate)
          ? Math.round(a.average_heartrate)
          : null,
      started_at: a.start_date,
      raw_data: {
        id: a.id,
        name: a.name,
        type: a.type,
      },
    });

    if (insertError) {
      console.error("[strava-sync] insert", insertError);
      errors += 1;
    } else {
      synced += 1;
    }
  }

  return new Response(JSON.stringify({ synced, skipped, errors }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
