import { supabase } from "@/lib/supabase";
import type { AiRecommendation } from "@/types/database";

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
