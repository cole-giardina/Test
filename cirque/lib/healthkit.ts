import { HealthKitQuery } from "apple-health";
import AppleHealth from "apple-health";
import { Platform } from "react-native";

/** Normalized workout from HealthKit for sync and display. */
export type HealthKitWorkout = {
  uuid: string;
  activityType: string;
  startDate: string;
  endDate: string;
  durationSeconds: number;
  totalEnergyBurned: number | null;
  totalDistance: number | null;
  sourceName: string;
  /** Raw `workoutActivityType` from HealthKit (e.g. `running`). */
  sourceActivityTypeRaw: string;
};

/**
 * Workout sync + HR/energy + run/bike distance quantities.
 * Swim distance comes from each workout’s `totalDistance`, not the separate
 * “Swimming Distance” type — omitting that avoids an odd one-line Health prompt.
 */
const READ_TYPES: Array<
  | "workoutType"
  | "activeEnergyBurned"
  | "heartRate"
  | "distanceWalkingRunning"
  | "distanceCycling"
> = [
  "workoutType",
  "activeEnergyBurned",
  "heartRate",
  "distanceWalkingRunning",
  "distanceCycling",
];

/** @deprecated Use READ_TYPES — kept for any legacy imports */
export const HEALTHKIT_READ_TYPES = READ_TYPES as unknown as string[];

/**
 * Map Apple `WorkoutActivityType` string or HK enum number to a short label.
 */
export function mapActivityType(appleActivityType: string | number): string {
  if (typeof appleActivityType === "number") {
    switch (appleActivityType) {
      case 37:
        return "Running";
      case 13:
        return "Cycling";
      case 46:
        return "Swimming";
      case 52:
        return "Trail Running";
      case 20:
        return "Hiking";
      case 63:
        return "Walking";
      default:
        return "Workout";
    }
  }

  const raw = String(appleActivityType).trim();
  const key = raw.toLowerCase().replace(/^hkworkoutactivitytype/i, "");
  const map: Record<string, string> = {
    running: "Running",
    cycling: "Cycling",
    swimming: "Swimming",
    trailrunning: "Trail Running",
    hiking: "Hiking",
    walking: "Walking",
    traditionalstrengthtraining: "Strength",
    functionalstrengthtraining: "Strength",
    yoga: "Yoga",
    elliptical: "Elliptical",
    rowing: "Rowing",
    other: "Workout",
  };
  if (map[key]) {
    return map[key]!;
  }
  if (key.includes("trail") && key.includes("run")) {
    return "Trail Running";
  }
  const spaced = raw
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^hk\s*workout\s*activity\s*type\s*/i, "")
    .trim();
  if (spaced.length > 0) {
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }
  return "Workout";
}

export async function requestHealthKitPermissions(): Promise<boolean> {
  if (Platform.OS !== "ios") {
    return false;
  }
  try {
    const result = await AppleHealth.requestAuthorization({
      read: [...READ_TYPES],
      write: [],
    });
    const workoutRead = result.permissions.read["workoutType"];
    return (
      workoutRead === "sharingAuthorized" ||
      result.status === "sharingAuthorized"
    );
  } catch (e) {
    console.error("[healthkit] requestHealthKitPermissions", e);
    return false;
  }
}

/** Plain row from `SampleConverters.convertQuantitySample` (native `execute()`, not `executeSamples()`). */
type NativeQuantityRow = {
  value?: number;
  quantityType?: string;
};

async function executeQuantityQueryPlain(
  config: ConstructorParameters<typeof HealthKitQuery>[0],
): Promise<NativeQuantityRow[]> {
  const query = new HealthKitQuery(config);
  const native = (
    query as unknown as {
      native: { execute: () => Promise<NativeQuantityRow[]> };
    }
  ).native;
  return native.execute();
}

type NativeWorkoutRow = {
  uuid?: string;
  workoutActivityType?: string;
  duration?: number;
  startDate?: string;
  endDate?: string;
  sourceName?: string;
  totalEnergyBurned?: number;
  totalDistance?: number;
};

export async function fetchRecentWorkouts(
  limit = 20,
): Promise<HealthKitWorkout[]> {
  if (Platform.OS !== "ios") {
    return [];
  }
  try {
    const query = new HealthKitQuery({
      type: "workout",
      kind: "workout",
      limit,
      ascending: false,
    });
    /**
     * `HealthKitQuery.execute()` uses `executeSamples()` + `wrapNativeSamples()`, which can throw
     * "Unknown sample type" when Expo does not surface `__typename` / `workoutActivityType` on the
     * native shared object. The underlying `native.execute()` returns plain workout dicts instead.
     */
    const native = (
      query as unknown as {
        native: { execute: () => Promise<NativeWorkoutRow[]> };
      }
    ).native;
    const rows = await native.execute();
    const out: HealthKitWorkout[] = [];
    const seenUuid = new Set<string>();
    for (const w of rows) {
      const uuid = String(w.uuid ?? "");
      if (!uuid) {
        continue;
      }
      if (seenUuid.has(uuid)) {
        continue;
      }
      seenUuid.add(uuid);
      const raw = String(w.workoutActivityType ?? "other");
      out.push({
        uuid,
        activityType: mapActivityType(raw),
        startDate: String(w.startDate ?? ""),
        endDate: String(w.endDate ?? ""),
        durationSeconds: Math.round(Number(w.duration ?? 0)),
        totalEnergyBurned:
          w.totalEnergyBurned != null && Number.isFinite(w.totalEnergyBurned)
            ? Number(w.totalEnergyBurned)
            : null,
        totalDistance:
          w.totalDistance != null && Number.isFinite(w.totalDistance)
            ? Number(w.totalDistance)
            : null,
        sourceName: w.sourceName?.trim() ? w.sourceName : "Unknown",
        sourceActivityTypeRaw: raw,
      });
    }
    return out;
  } catch (e) {
    console.error("[healthkit] fetchRecentWorkouts", e);
    return [];
  }
}

export async function fetchWorkoutHeartRate(
  workoutStartDate: string,
  workoutEndDate: string,
): Promise<number | null> {
  if (Platform.OS !== "ios") {
    return null;
  }
  try {
    const rows = await executeQuantityQueryPlain({
      type: "heartRate",
      kind: "quantity",
      startDate: workoutStartDate,
      endDate: workoutEndDate,
      ascending: true,
    });
    if (rows.length === 0) {
      return null;
    }
    const sum = rows.reduce((acc, r) => acc + Number(r.value ?? 0), 0);
    return sum / rows.length;
  } catch (e) {
    console.error("[healthkit] fetchWorkoutHeartRate", e);
    return null;
  }
}

/** Sum of active energy (kcal) from midnight local time to now. */
export async function fetchTodaysActiveCalories(): Promise<number> {
  if (Platform.OS !== "ios") {
    return 0;
  }
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    const rows = await executeQuantityQueryPlain({
      type: "activeEnergyBurned",
      kind: "quantity",
      startDate: start,
      endDate: end,
      ascending: true,
    });
    let total = 0;
    for (const r of rows) {
      total += Number(r.value ?? 0);
    }
    return Math.round(total * 10) / 10;
  } catch (e) {
    console.error("[healthkit] fetchTodaysActiveCalories", e);
    return 0;
  }
}

/** @deprecated Use fetchTodaysActiveCalories */
export async function fetchTodaysCaloriesBurned(): Promise<number> {
  return fetchTodaysActiveCalories();
}
