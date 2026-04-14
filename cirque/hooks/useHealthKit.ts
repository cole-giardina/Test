import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

import AppleHealth from "apple-health";

import { loadHealthKitSyncMeta } from "@/lib/healthSyncMeta";
import { fetchRecentWorkouts, requestHealthKitPermissions } from "@/lib/healthkit";
import {
  syncHealthKitWorkouts,
  type SyncResult,
} from "@/lib/workoutSync";

const isIos = Platform.OS === "ios";

export type UseHealthKitOptions = {
  /** When set, last sync counts from background or manual sync are restored from storage. */
  profileUserId?: string | null;
};

export function useHealthKit(options?: UseHealthKitOptions): {
  hasPermissions: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  lastSyncAt: Date | null;
  requestPermissions: () => Promise<boolean>;
  syncWorkouts: (userId: string) => Promise<SyncResult>;
} {
  const profileUserId = options?.profileUserId ?? null;
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isLoading, setIsLoading] = useState(isIos);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(
    null,
  );
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!isIos) {
      return;
    }

    let cancelled = false;

    async function probe() {
      try {
        const status = await AppleHealth.getAuthorizationStatus([
          "workoutType",
          "heartRate",
          "activeEnergyBurned",
        ]);
        let ok = status["workoutType"] === "sharingAuthorized";
        if (!ok) {
          ok = status["heartRate"] === "sharingAuthorized";
        }
        if (!ok) {
          const sample = await fetchRecentWorkouts(1);
          if (sample.length > 0) {
            ok = true;
          }
        }
        if (!cancelled) {
          setHasPermissions(ok);
        }
      } catch (e) {
        console.warn("[useHealthKit] probe", e);
        if (!cancelled) {
          setHasPermissions(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void probe();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isIos || !profileUserId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const stored = await loadHealthKitSyncMeta(profileUserId);
      if (cancelled || !stored) {
        return;
      }
      setLastSyncResult({
        synced: stored.synced,
        skipped: stored.skipped,
        errors: stored.errors,
        fetchError: stored.fetchError,
      });
      setLastSyncAt(new Date(stored.at));
    })();
    return () => {
      cancelled = true;
    };
  }, [profileUserId]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!isIos) {
      return false;
    }
    const ok = await requestHealthKitPermissions();
    setHasPermissions(ok);
    return ok;
  }, []);

  const syncWorkouts = useCallback(
    async (userId: string): Promise<SyncResult> => {
      if (!isIos) {
        return { synced: 0, skipped: 0, errors: 0 };
      }
      setIsSyncing(true);
      try {
        const r = await syncHealthKitWorkouts(userId);
        setLastSyncResult(r);
        setLastSyncAt(new Date());
        return r;
      } finally {
        setIsSyncing(false);
      }
    },
    [],
  );

  return {
    hasPermissions: isIos ? hasPermissions : false,
    isLoading: isIos ? isLoading : false,
    isSyncing: isIos ? isSyncing : false,
    lastSyncResult: isIos ? lastSyncResult : null,
    lastSyncAt: isIos ? lastSyncAt : null,
    requestPermissions,
    syncWorkouts,
  };
}
