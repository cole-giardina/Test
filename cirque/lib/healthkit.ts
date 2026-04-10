import { Platform } from "react-native";

/**
 * Health data types to request (Apple HealthKit identifiers).
 * Wire up with `apple-health` after the dev client is running.
 */
export const HEALTHKIT_READ_TYPES = [
  "HKWorkoutTypeIdentifier",
  "HKQuantityTypeIdentifierActiveEnergyBurned",
  "HKQuantityTypeIdentifierHeartRate",
  "HKQuantityTypeIdentifierDistanceWalkingRunning",
  "HKQuantityTypeIdentifierDistanceCycling",
  "HKQuantityTypeIdentifierBodyMass",
  "HKQuantityTypeIdentifierHeight",
];

export async function requestHealthKitPermissions(): Promise<boolean> {
  if (Platform.OS !== "ios") {
    return false;
  }
  // TODO: implement after dev build is running (apple-health module)
  console.log("HealthKit permissions requested");
  return false;
}

export async function fetchRecentWorkouts(limit = 10): Promise<unknown[]> {
  if (Platform.OS !== "ios") {
    return [];
  }
  // TODO: implement after dev build is running
  void limit;
  return [];
}

export async function fetchTodaysCaloriesBurned(): Promise<number> {
  if (Platform.OS !== "ios") {
    return 0;
  }
  // TODO: implement after dev build is running
  return 0;
}
