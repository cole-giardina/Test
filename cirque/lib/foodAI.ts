import Anthropic from "@anthropic-ai/sdk";
import Constants from "expo-constants";

import { supabase } from "@/lib/supabase";

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 500;

const SYSTEM_PROMPT =
  "You are a nutrition expert assistant for Cirque, a fitness app for endurance athletes. When given a food description, extract and estimate nutritional data. Always respond with valid JSON only, no other text. Be generous with estimates for athlete-sized portions. For electrolytes, be as accurate as possible as these are critical for recovery.";

export type NutritionConfidence = "high" | "medium" | "low";

export type ParsedFoodNutrition = {
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sodium_mg: number;
  potassium_mg: number;
  magnesium_mg: number;
  confidence: NutritionConfidence;
  notes: string;
};

function getAnthropicApiKey(): string {
  const fromEnv = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  const fromExtra = Constants.expoConfig?.extra?.anthropicApiKey;
  const raw =
    typeof fromEnv === "string" && fromEnv.trim()
      ? fromEnv
      : typeof fromExtra === "string"
        ? fromExtra
        : "";
  return raw.trim();
}

function getClient(): Anthropic {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    throw new Error(
      "Anthropic key missing: in cirque/.env.local put EXPO_PUBLIC_ANTHROPIC_API_KEY=your-key on one line, save the file (⌘S), then restart Expo with npx expo start --clear.",
    );
  }
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

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
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Claude did not return valid JSON. Try rephrasing your meal.");
  }

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
  const confidence: NutritionConfidence =
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

function useFoodParseEdge(): boolean {
  const v = process.env.EXPO_PUBLIC_USE_FOOD_PARSE_EDGE?.toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

async function parseFoodEntryViaEdge(
  description: string,
  mealType: string,
): Promise<ParsedFoodNutrition> {
  const trimmed = description.trim();
  if (trimmed.length < 3) {
    throw new Error("Describe your food in a bit more detail (at least 3 characters).");
  }

  const { data, error } = await supabase.functions.invoke<{
    nutrition?: ParsedFoodNutrition;
    error?: string;
  }>("parse-food", {
    body: { description: trimmed, mealType },
  });

  if (error) {
    throw new Error(error.message ?? "Food parsing failed.");
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  if (!data?.nutrition) {
    throw new Error("Unexpected response from food parser.");
  }
  return data.nutrition;
}

/**
 * Calls Claude to turn natural-language food text into structured nutrition estimates.
 * When `EXPO_PUBLIC_USE_FOOD_PARSE_EDGE` is true, calls the Supabase Edge Function instead (recommended for production).
 */
export async function parseFoodEntry(
  description: string,
  mealType: string,
): Promise<ParsedFoodNutrition> {
  if (useFoodParseEdge()) {
    return parseFoodEntryViaEdge(description, mealType);
  }

  const trimmed = description.trim();
  if (trimmed.length < 3) {
    throw new Error("Describe your food in a bit more detail (at least 3 characters).");
  }

  const userMessage = `Analyze this food entry and return nutritional estimates as JSON:

Food: ${trimmed}
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

  const client = getClient();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    const textParts: string[] = [];
    for (const b of response.content) {
      if (b.type === "text") {
        textParts.push(b.text);
      }
    }
    if (textParts.length === 0) {
      throw new Error("Empty response from food parser.");
    }
    const jsonText = extractJsonObject(textParts.join("\n"));
    return parseNutritionJson(jsonText);
  } catch (e) {
    if (e instanceof Error && e.message.includes("EXPO_PUBLIC_ANTHROPIC")) {
      throw e;
    }
    if (e instanceof TypeError && e.message.toLowerCase().includes("network")) {
      throw new Error("Network error. Check your connection and try again.");
    }
    if (e instanceof Error) {
      if (e.message.includes("JSON") || e.message.includes("shape")) {
        throw e;
      }
      throw new Error(e.message || "Could not reach Claude. Try again.");
    }
    throw new Error("Something went wrong while analyzing food.");
  }
}
