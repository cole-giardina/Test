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
    .eq("raw_data->>uuid", uuid)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[workoutSync] workoutExistsForUuid", error.message);
    return false;
  }
  return data != null;
}

/**
 * Apple sometimes surfaces the same session as multiple HKWorkout samples (different UUIDs).
 * Treat as duplicate if same user/source, activity, duration, and start time within a short window.
 */
async function workoutExistsSimilarHealthKit(
  userId: string,
  startedAt: string,
  durationSeconds: number,
  activityType: string,
): Promise<boolean> {
  const t = Date.parse(startedAt);
  if (Number.isNaN(t)) {
    return false;
  }
  const windowMs = 120_000;
  const from = new Date(t - windowMs).toISOString();
  const to = new Date(t + windowMs).toISOString();

  const { data, error } = await supabase
    .from("workouts")
    .select("id")
    .eq("user_id", userId)
    .eq("source", "healthkit")
    .eq("activity_type", activityType)
    .eq("duration_seconds", durationSeconds)
    .gte("started_at", from)
    .lte("started_at", to)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[workoutSync] workoutExistsSimilarHealthKit", error.message);
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

  const seenUuids = new Set<string>();

  for (const w of workouts) {
    try {
      if (seenUuids.has(w.uuid)) {
        result.skipped += 1;
        continue;
      }
      seenUuids.add(w.uuid);

      const existsByUuid = await workoutExistsForUuid(userId, w.uuid);
      if (existsByUuid) {
        result.skipped += 1;
        continue;
      }

      const existsSimilar = await workoutExistsSimilarHealthKit(
        userId,
        w.startDate,
        w.durationSeconds,
        w.activityType,
      );
      if (existsSimilar) {
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

/** Single workout row for the user, or null if missing / not owned. */
export async function getWorkoutById(
  userId: string,
  workoutId: string,
): Promise<Workout | null> {
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .eq("id", workoutId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export type ManualWorkoutInput = {
  activity_type: string;
  duration_seconds: number;
  distance_meters?: number | null;
  calories_burned?: number | null;
  avg_heart_rate?: number | null;
  elevation_gain_m?: number | null;
  started_at: string;
};

function sanitizeNum(n: number | null | undefined): number | null {
  if (n == null) {
    return null;
  }
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}

/**
 * Inserts a user-entered workout (`source: manual`). Does not write to HealthKit.
 */
export async function insertManualWorkout(
  userId: string,
  input: ManualWorkoutInput,
): Promise<Workout> {
  const activity = input.activity_type.trim();
  if (!activity) {
    throw new Error("Activity type is required.");
  }
  const dur = Math.max(0, Math.floor(Number(input.duration_seconds) || 0));
  const { data, error } = await supabase
    .from("workouts")
    .insert({
      user_id: userId,
      source: "manual",
      activity_type: activity,
      duration_seconds: dur,
      distance_meters: sanitizeNum(input.distance_meters ?? null),
      calories_burned: sanitizeNum(input.calories_burned ?? null),
      avg_heart_rate:
        input.avg_heart_rate != null
          ? Math.round(Number(input.avg_heart_rate)) || null
          : null,
      elevation_gain_m: sanitizeNum(input.elevation_gain_m ?? null),
      started_at: input.started_at,
      raw_data: { manual: true },
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}
