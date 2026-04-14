import {
  HealthKitQuery,
  QuantitySample,
  WorkoutSample,
} from "apple-health";
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

const READ_TYPES: Array<
  | "workoutType"
  | "activeEnergyBurned"
  | "heartRate"
  | "distanceWalkingRunning"
  | "distanceCycling"
  | "bodyMass"
> = [
  "workoutType",
  "activeEnergyBurned",
  "heartRate",
  "distanceWalkingRunning",
  "distanceCycling",
  "bodyMass",
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
    const samples = await query.execute();
    const out: HealthKitWorkout[] = [];
    for (const s of samples) {
      if (s.__typename !== "WorkoutSample") {
        continue;
      }
      const w = s as WorkoutSample;
      const raw = String(w.workoutActivityType);
      out.push({
        uuid: w.uuid,
        activityType: mapActivityType(raw),
        startDate: w.startDate,
        endDate: w.endDate,
        durationSeconds: w.duration,
        totalEnergyBurned:
          w.totalEnergyBurned != null ? Number(w.totalEnergyBurned) : null,
        totalDistance: w.totalDistance != null ? Number(w.totalDistance) : null,
        sourceName: w.sourceName ?? "Unknown",
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
    const query = new HealthKitQuery({
      type: "heartRate",
      kind: "quantity",
      startDate: workoutStartDate,
      endDate: workoutEndDate,
      ascending: true,
    });
    const samples = await query.execute();
    const hr = samples.filter(
      (s): s is QuantitySample => s.__typename === "QuantitySample",
    );
    if (hr.length === 0) {
      return null;
    }
    const sum = hr.reduce((acc, s) => acc + s.value, 0);
    return sum / hr.length;
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
    const query = new HealthKitQuery({
      type: "activeEnergyBurned",
      kind: "quantity",
      startDate: start,
      endDate: end,
      ascending: true,
    });
    const samples = await query.execute();
    const quantities = samples.filter(
      (s): s is QuantitySample => s.__typename === "QuantitySample",
    );
    let total = 0;
    for (const s of quantities) {
      total += s.value;
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
