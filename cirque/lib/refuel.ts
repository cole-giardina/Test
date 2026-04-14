import { supabase } from "@/lib/supabase";
import type { AiRecommendation } from "@/types/database";

export type GenerateRefuelParams = {
  /** Optional workout to anchor the advice; defaults to most recent workout server-side. */
  workoutId?: string | null;
};

/**
 * Calls the `refuel` Edge Function: builds context from profile, latest workout, last-24h food,
 * generates text with Claude, persists `ai_recommendations` with `context_snapshot`.
 */
export async function generateRefuelAdvice(
  params?: GenerateRefuelParams,
): Promise<AiRecommendation> {
  const { data, error } = await supabase.functions.invoke<{
    recommendation?: AiRecommendation;
    error?: string;
  }>("refuel", {
    body: {
      workout_id: params?.workoutId ?? undefined,
    },
  });

  if (error) {
    throw new Error(error.message ?? "Refuel request failed");
  }
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }
  if (!data?.recommendation) {
    throw new Error("No recommendation returned");
  }
  return data.recommendation;
}
