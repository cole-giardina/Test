import type { Workout } from "@/types/database";

import { saveHealthKitSyncMeta } from "@/lib/healthSyncMeta";
import { fetchRecentWorkouts, fetchWorkoutHeartRate } from "@/lib/healthkit";
import { supabase } from "@/lib/supabase";

export type SyncResult = {
  synced: number;
  skipped: number;
  errors: number;
  /** Present when HealthKit data could not be loaded (permissions, simulator, etc.). */
  fetchError?: string;
};

async function workoutExistsForUuid(
  userId: string,
  uuid: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("workouts")
    .select("id")
    .eq("user_id", userId)
    .eq("source", "healthkit")
    .contains("raw_data", { uuid })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[workoutSync] workoutExistsForUuid", error.message);
    return false;
  }
  return data != null;
}

/**
 * Pull recent HealthKit workouts and upsert into Supabase (dedup by `raw_data.uuid`).
 */
export async function syncHealthKitWorkouts(
  userId: string,
): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, skipped: 0, errors: 0 };
  let workouts;
  try {
    workouts = await fetchRecentWorkouts(50);
  } catch (e) {
    console.error("[workoutSync] fetchRecentWorkouts", e);
    const msg =
      e instanceof Error ? e.message : "Could not read workouts from Apple Health.";
    result.fetchError = msg;
    await saveHealthKitSyncMeta(userId, result);
    return result;
  }

  for (const w of workouts) {
    try {
      const exists = await workoutExistsForUuid(userId, w.uuid);
      if (exists) {
        result.skipped += 1;
        continue;
      }

      const avgHr = await fetchWorkoutHeartRate(w.startDate, w.endDate);
      const heartRate =
        avgHr != null && Number.isFinite(avgHr) ? Math.round(avgHr) : null;

      const { error: insertError } = await supabase.from("workouts").insert({
        user_id: userId,
        source: "healthkit",
        activity_type: w.activityType,
        duration_seconds: w.durationSeconds,
        distance_meters: w.totalDistance,
        calories_burned: w.totalEnergyBurned,
        avg_heart_rate: heartRate,
        started_at: w.startDate,
        raw_data: {
          uuid: w.uuid,
          source_name: w.sourceName,
          end_date: w.endDate,
          original_activity_type: w.sourceActivityTypeRaw,
        },
      });

      if (insertError) {
        console.error("[workoutSync] insert", insertError.message);
        result.errors += 1;
      } else {
        result.synced += 1;
      }
    } catch (e) {
      console.error("[workoutSync] workout loop", e);
      result.errors += 1;
    }
  }

  await saveHealthKitSyncMeta(userId, result);
  return result;
}

/**
 * Load workouts from Supabase for the current user.
 */
export async function getWorkouts(
  userId: string,
  limit = 10,
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
