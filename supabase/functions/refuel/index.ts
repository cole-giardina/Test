import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 900;

const SYSTEM_PROMPT = `You are Cirque's endurance nutrition coach. Give practical post-training refueling guidance: hydration, carbs, protein, and electrolytes when relevant. Be concise (2–4 short paragraphs), actionable, and specific to the workout and what they've eaten if data is provided. No medical diagnoses. Plain text only — no markdown headings or bullet lists unless truly helpful.`;

type ProfileRow = {
  id: string;
  display_name: string | null;
  sport_type: string | null;
  training_level: string | null;
  daily_calorie_goal: number | null;
  daily_protein_g: number | null;
  dietary_restrictions: string[] | null;
};

type WorkoutRow = {
  id: string;
  activity_type: string | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  calories_burned: number | null;
  avg_heart_rate: number | null;
  started_at: string | null;
  source: string;
};

type FoodRow = {
  description: string | null;
  meal_type: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  sodium_mg: number | null;
  potassium_mg: number | null;
  magnesium_mg: number | null;
  logged_at: string | null;
};

function sumNutrition(rows: FoodRow[]) {
  const t = {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    sodium_mg: 0,
    potassium_mg: 0,
    magnesium_mg: 0,
  };
  for (const r of rows) {
    t.calories += Number(r.calories ?? 0);
    t.protein_g += Number(r.protein_g ?? 0);
    t.carbs_g += Number(r.carbs_g ?? 0);
    t.fat_g += Number(r.fat_g ?? 0);
    t.sodium_mg += Number(r.sodium_mg ?? 0);
    t.potassium_mg += Number(r.potassium_mg ?? 0);
    t.magnesium_mg += Number(r.magnesium_mg ?? 0);
  }
  return t;
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

  let body: { workout_id?: string | null } = {};
  try {
    const t = await req.json();
    if (t && typeof t === "object") {
      body = t as { workout_id?: string | null };
    }
  } catch {
    /* empty body ok */
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select(
      "id, display_name, sport_type, training_level, daily_calorie_goal, daily_protein_g, dietary_restrictions",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const p = profile as ProfileRow;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: foodRows, error: foodError } = await admin
    .from("food_logs")
    .select(
      "description, meal_type, calories, protein_g, carbs_g, fat_g, sodium_mg, potassium_mg, magnesium_mg, logged_at",
    )
    .eq("user_id", p.id)
    .gte("logged_at", since)
    .order("logged_at", { ascending: false })
    .limit(30);

  if (foodError) {
    console.error("[refuel] food_logs", foodError);
  }

  const meals = (foodRows ?? []) as FoodRow[];
  const nutrition24h = sumNutrition(meals);

  let workout: WorkoutRow | null = null;
  const wid = body.workout_id?.trim();
  if (wid) {
    const { data: w, error: wErr } = await admin
      .from("workouts")
      .select(
        "id, activity_type, duration_seconds, distance_meters, calories_burned, avg_heart_rate, started_at, source",
      )
      .eq("id", wid)
      .eq("user_id", p.id)
      .maybeSingle();
    if (!wErr && w) {
      workout = w as WorkoutRow;
    }
  }
  if (!workout) {
    const { data: w, error: wErr } = await admin
      .from("workouts")
      .select(
        "id, activity_type, duration_seconds, distance_meters, calories_burned, avg_heart_rate, started_at, source",
      )
      .eq("user_id", p.id)
      .order("started_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (!wErr && w) {
      workout = w as WorkoutRow;
    }
  }

  const contextSnapshot = {
    version: 1 as const,
    generated_at: new Date().toISOString(),
    profile: {
      display_name: p.display_name,
      sport_type: p.sport_type,
      training_level: p.training_level,
      daily_calorie_goal: p.daily_calorie_goal,
      daily_protein_g: p.daily_protein_g,
      dietary_restrictions: p.dietary_restrictions ?? [],
    },
    workout: workout
      ? {
          id: workout.id,
          activity_type: workout.activity_type,
          duration_seconds: workout.duration_seconds,
          distance_meters: workout.distance_meters,
          calories_burned: workout.calories_burned,
          avg_heart_rate: workout.avg_heart_rate,
          started_at: workout.started_at,
          source: workout.source,
        }
      : null,
    nutrition_last_24h: nutrition24h,
    recent_meals: meals.slice(0, 12).map((m) => ({
      description: m.description,
      meal_type: m.meal_type,
      calories: m.calories,
      logged_at: m.logged_at,
    })),
  };

  const userMessage = `Generate refueling guidance for this athlete.

Context (JSON):
${JSON.stringify(contextSnapshot, null, 2)}

If there is no recent workout in the context, acknowledge that and still give helpful fueling suggestions based on profile and recent intake. If food data is sparse, say what to prioritize next.`;

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Server misconfiguration: missing ANTHROPIC_API_KEY" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!anthropicRes.ok) {
    const t = await anthropicRes.text();
    console.error("[refuel] Anthropic", anthropicRes.status, t);
    return new Response(JSON.stringify({ error: "Could not generate recommendation" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const anthropicJson = (await anthropicRes.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const textParts: string[] = [];
  for (const b of anthropicJson.content ?? []) {
    if (b.type === "text" && b.text) {
      textParts.push(b.text);
    }
  }
  const recommendationText = textParts.join("\n").trim();
  if (!recommendationText) {
    return new Response(JSON.stringify({ error: "Empty model response" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: inserted, error: insertError } = await admin
    .from("ai_recommendations")
    .insert({
      user_id: p.id,
      workout_id: workout?.id ?? null,
      trigger_type: "post_workout_refuel",
      recommendation: recommendationText,
      context_snapshot: contextSnapshot,
    })
    .select()
    .single();

  if (insertError) {
    console.error("[refuel] insert", insertError);
    return new Response(JSON.stringify({ error: "Could not save recommendation" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ recommendation: inserted }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
