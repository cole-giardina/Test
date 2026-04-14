import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 500;

const SYSTEM_PROMPT =
  "You are a nutrition expert assistant for Cirque, a fitness app for endurance athletes. When given a food description, extract and estimate nutritional data. Always respond with valid JSON only, no other text. Be generous with estimates for athlete-sized portions. For electrolytes, be as accurate as possible as these are critical for recovery.";

type ParsedFoodNutrition = {
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sodium_mg: number;
  potassium_mg: number;
  magnesium_mg: number;
  confidence: "high" | "medium" | "low";
  notes: string;
};

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  if (fence?.[1]) {
    return fence[1].trim();
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

function parseNutritionJson(text: string): ParsedFoodNutrition {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Unexpected JSON shape from food parser.");
  }
  const o = parsed as Record<string, unknown>;

  const num = (k: string): number => {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) {
      return v;
    }
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) {
        return n;
      }
    }
    throw new Error(`Missing or invalid number field: ${k}`);
  };

  const numOptional = (k: string): number => {
    try {
      return num(k);
    } catch {
      return 0;
    }
  };

  const str = (k: string, fallback = ""): string => {
    const v = o[k];
    return typeof v === "string" ? v : fallback;
  };

  const confRaw = str("confidence", "medium").toLowerCase();
  const confidence: ParsedFoodNutrition["confidence"] =
    confRaw === "high" || confRaw === "low" || confRaw === "medium"
      ? confRaw
      : "medium";

  return {
    description: str("description", "Meal"),
    calories: num("calories"),
    protein_g: num("protein_g"),
    carbs_g: num("carbs_g"),
    fat_g: num("fat_g"),
    sodium_mg: numOptional("sodium_mg"),
    potassium_mg: numOptional("potassium_mg"),
    magnesium_mg: numOptional("magnesium_mg"),
    confidence,
    notes: str("notes", ""),
  };
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
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { description?: string; mealType?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const description = (body.description ?? "").trim();
  const mealType = (body.mealType ?? "Snack").trim();
  if (description.length < 3) {
    return new Response(
      JSON.stringify({
        error: "Describe your food in a bit more detail (at least 3 characters).",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

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

  const userMessage = `Analyze this food entry and return nutritional estimates as JSON:

Food: ${description}
Meal type: ${mealType}

Return exactly this JSON structure:
{
  "description": "cleaned up description of what was logged",
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "sodium_mg": number,
  "potassium_mg": number,
  "magnesium_mg": number,
  "confidence": "high" | "medium" | "low",
  "notes": "any important notes about the estimate"
}`;

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
    console.error("[parse-food] Anthropic error", anthropicRes.status, t);
    return new Response(
      JSON.stringify({ error: "Could not analyze food. Try again." }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
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
  if (textParts.length === 0) {
    return new Response(JSON.stringify({ error: "Empty response from food parser." }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const jsonText = extractJsonObject(textParts.join("\n"));
    const parsed = parseNutritionJson(jsonText);
    return new Response(JSON.stringify({ nutrition: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[parse-food] parse", e);
    return new Response(
      JSON.stringify({ error: "Claude did not return valid JSON. Try rephrasing your meal." }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
