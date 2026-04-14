import { useCallback, useEffect, useState } from "react";

import { getDailyTotals, getTodaysFoodLogs } from "@/lib/foodLog";
import type { DailyTotals } from "@/lib/foodLog";

export type { DailyTotals } from "@/lib/foodLog";
import {
  getLatestAiRecommendation,
  setRecommendationHelpful,
} from "@/lib/dashboardData";
import { generateRefuelAdvice } from "@/lib/refuel";
import { getWorkouts } from "@/lib/workoutSync";
import { getTodayDateString } from "@/lib/formatters";
import { useAuth } from "@/hooks/useAuth";
import type {
  AiRecommendation,
  FoodLog,
  Profile,
  Workout,
} from "@/types/database";

export type DashboardData = {
  profile: Profile | null;
  dailyTotals: DailyTotals | null;
  todaysFoodLogs: FoodLog[];
  recentWorkouts: Workout[];
  latestRecommendation: AiRecommendation | null;
};

const emptyData: DashboardData = {
  profile: null,
  dailyTotals: null,
  todaysFoodLogs: [],
  recentWorkouts: [],
  latestRecommendation: null,
};

export function useDashboard(): {
  data: DashboardData;
  isLoading: boolean;
  refresh: () => Promise<void>;
  /** Calls Edge Function `refuel`, then reloads latest recommendation. */
  generateRefuel: () => Promise<void>;
  setRecommendationFeedback: (
    recommendationId: string,
    helpful: boolean,
  ) => Promise<void>;
  refuelCooldownRemainingSec: number;
} {
  const { profile, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [isLoading, setIsLoading] = useState(true);
  const [refuelCooldownRemainingSec, setRefuelCooldownRemainingSec] = useState(0);
  const COOLDOWN_SECONDS = 10 * 60;

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
    if (authLoading) {
      return;
    }
    if (!profile?.id) {
      setData({ ...emptyData, profile });
      setIsLoading(false);
      return;
    }

    if (!options?.silent) {
      setIsLoading(true);
    }
    const userId = profile.id;
    const today = getTodayDateString();

    const [
      logsResult,
      totalsResult,
      workoutsResult,
      recResult,
    ] = await Promise.all([
      getTodaysFoodLogs(userId).catch((e) => {
        console.error("[useDashboard] todaysFoodLogs", e);
        return [] as FoodLog[];
      }),
      getDailyTotals(userId, today).catch((e) => {
        console.error("[useDashboard] dailyTotals", e);
        return null as DailyTotals | null;
      }),
      getWorkouts(userId, 3).catch((e) => {
        console.error("[useDashboard] recentWorkouts", e);
        return [] as Workout[];
      }),
      getLatestAiRecommendation(userId).catch((e) => {
        console.error("[useDashboard] latestRecommendation", e);
        return null as AiRecommendation | null;
      }),
    ]);

    setData({
      profile,
      dailyTotals: totalsResult,
      todaysFoodLogs: logsResult,
      recentWorkouts: workoutsResult,
      latestRecommendation: recResult,
    });
    setIsLoading(false);
  },
    [profile, authLoading],
  );

  const generateRefuel = useCallback(async () => {
    if (!profile?.id) {
      return;
    }
    await generateRefuelAdvice();
    await load({ silent: true });
  }, [profile?.id, load]);

  const setRecommendationFeedback = useCallback(
    async (recommendationId: string, helpful: boolean) => {
      await setRecommendationHelpful(recommendationId, helpful);
      await load({ silent: true });
    },
    [load],
  );

  useEffect(() => {
    const recommendation = data.latestRecommendation;
    if (!recommendation?.created_at) {
      setRefuelCooldownRemainingSec(0);
      return;
    }

    const compute = () => {
      const createdMs = Date.parse(recommendation.created_at);
      if (Number.isNaN(createdMs)) {
        setRefuelCooldownRemainingSec(0);
        return;
      }
      const elapsedSec = Math.floor((Date.now() - createdMs) / 1000);
      const remaining = Math.max(0, COOLDOWN_SECONDS - elapsedSec);
      setRefuelCooldownRemainingSec(remaining);
    };

    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [data.latestRecommendation]);

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }
    void load();
  }, [authLoading, load]);

  return {
    data,
    isLoading,
    refresh: () => load({ silent: true }),
    generateRefuel,
    setRecommendationFeedback,
    refuelCooldownRemainingSec,
  };
}
