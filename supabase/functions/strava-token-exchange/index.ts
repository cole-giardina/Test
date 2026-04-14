import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

type StravaTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number };
};

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

  let body: { code?: string; redirect_uri?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const code = body.code?.trim();
  const redirectUri = body.redirect_uri?.trim();
  if (!code || !redirectUri) {
    return new Response(JSON.stringify({ error: "code and redirect_uri required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const clientId = Deno.env.get("STRAVA_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("STRAVA_CLIENT_SECRET") ?? "";
  if (!clientId || !clientSecret) {
    return new Response(
      JSON.stringify({ error: "Server misconfiguration: Strava OAuth" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
  });

  if (!tokenRes.ok) {
    const t = await tokenRes.text();
    console.error("[strava-token-exchange] Strava error", tokenRes.status, t);
    return new Response(JSON.stringify({ error: "Strava token exchange failed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const tokenJson = (await tokenRes.json()) as StravaTokenResponse;
  const athleteId = tokenJson.athlete?.id ?? null;
  const expiresAt = new Date(tokenJson.expires_at * 1000).toISOString();

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError || !profile?.id) {
    console.error("[strava-token-exchange] profile", profileError);
    return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: upsertError } = await admin.from("strava_connections").upsert(
    {
      profile_id: profile.id,
      access_token: tokenJson.access_token,
      refresh_token: tokenJson.refresh_token,
      expires_at: expiresAt,
      athlete_id: athleteId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" },
  );

  if (upsertError) {
    console.error("[strava-token-exchange] upsert", upsertError);
    return new Response(JSON.stringify({ error: "Could not save Strava connection" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: profileUpdateError } = await admin
    .from("profiles")
    .update({ strava_linked: true })
    .eq("id", profile.id);

  if (profileUpdateError) {
    console.error("[strava-token-exchange] profile update", profileUpdateError);
  }

  return new Response(JSON.stringify({ ok: true, athlete_id: athleteId }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
