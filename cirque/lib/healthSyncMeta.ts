import AsyncStorage from "@react-native-async-storage/async-storage";

import type { SyncResult } from "@/lib/workoutSync";

const PREFIX = "@cirque/hk_sync/";

export type StoredHealthKitSync = SyncResult & {
  at: string;
  userId: string;
};

function keyForUser(userId: string): string {
  return `${PREFIX}${userId}`;
}

export async function saveHealthKitSyncMeta(
  userId: string,
  result: SyncResult,
): Promise<void> {
  const payload: StoredHealthKitSync = {
    ...result,
    at: new Date().toISOString(),
    userId,
  };
  await AsyncStorage.setItem(keyForUser(userId), JSON.stringify(payload));
}

export async function loadHealthKitSyncMeta(
  userId: string,
): Promise<StoredHealthKitSync | null> {
  const raw = await AsyncStorage.getItem(keyForUser(userId));
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as StoredHealthKitSync;
    if (
      parsed &&
      typeof parsed.userId === "string" &&
      typeof parsed.at === "string" &&
      typeof parsed.synced === "number"
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}
