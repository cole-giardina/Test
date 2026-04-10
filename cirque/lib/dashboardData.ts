import { supabase } from "@/lib/supabase";
import type { AiRecommendation, Workout } from "@/types/database";

/**
 * @param userId — `profiles.id`
 */
export async function getRecentWorkouts(
  userId: string,
  limit = 3,
): Promise<Workout[]> {
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

/**
 * Most recent AI recommendation for the user.
 * @param userId — `profiles.id`
 */
export async function getLatestAiRecommendation(
  userId: string,
): Promise<AiRecommendation | null> {
  const { data, error } = await supabase
    .from("ai_recommendations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}
