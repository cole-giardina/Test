import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FrostedCard } from "@/components/ui/FrostedCard";
import { colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { useHealthKit } from "@/hooks/useHealthKit";
import { formatDate, formatDistance, formatDuration } from "@/lib/formatters";
import { getWorkouts } from "@/lib/workoutSync";
import type { Workout } from "@/types/database";

function iconForActivity(activity: string | null): keyof typeof Ionicons.glyphMap {
  const a = (activity ?? "").toLowerCase();
  if (a.includes("swim")) {
    return "water-outline";
  }
  if (a.includes("cycl")) {
    return "bicycle";
  }
  if (a.includes("run") || a.includes("trail")) {
    return "fitness-outline";
  }
  if (a.includes("walk") || a.includes("hik")) {
    return "walk-outline";
  }
  return "pulse-outline";
}

export default function WorkoutsListScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const userId = profile?.id;
  const {
    hasPermissions,
    isLoading: hkLoading,
    isSyncing,
    lastSyncResult,
    requestPermissions,
    syncWorkouts,
  } = useHealthKit({ profileUserId: userId });

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadList = useCallback(async () => {
    if (!userId) {
      setWorkouts([]);
      setListLoading(false);
      return;
    }
    setListLoading(true);
    try {
      const rows = await getWorkouts(userId, 50);
      setWorkouts(rows);
    } catch (e) {
      console.error("[WorkoutsTab] loadList", e);
      setWorkouts([]);
    } finally {
      setListLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void loadList();
    }, [loadList]),
  );

  async function runSync() {
    if (!userId) {
      return;
    }
    if (!hasPermissions) {
      const ok = await requestPermissions();
      if (!ok) {
        return;
      }
    }
    await syncWorkouts(userId);
    await loadList();
  }

  async function onRefresh() {
    if (!userId) {
      return;
    }
    setRefreshing(true);
    try {
      if (hasPermissions) {
        await syncWorkouts(userId);
      }
      await loadList();
    } finally {
      setRefreshing(false);
    }
  }

  const showSyncBar = lastSyncResult != null;
  const syncHasIssue =
    Boolean(lastSyncResult?.fetchError) ||
    (lastSyncResult != null && lastSyncResult.errors > 0);

  return (
    <View
      className="flex-1 bg-brand-bg"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
        <Text className="text-2xl font-bold text-white">Workouts</Text>
        <View className="flex-row items-center gap-2">
          <Pressable
            className="h-10 min-w-[40px] items-center justify-center rounded-full px-2 active:opacity-80"
            style={{ backgroundColor: colors.surface }}
            disabled={!userId}
            onPress={() => router.push("/(tabs)/workouts/manual")}
            accessibilityRole="button"
            accessibilityLabel="Add manual workout"
          >
            <Ionicons name="add" size={24} color={colors.accentBright} />
          </Pressable>
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full active:opacity-80"
            style={{ backgroundColor: colors.surface }}
            disabled={isSyncing || hkLoading || !userId}
            onPress={() => void runSync()}
            accessibilityRole="button"
            accessibilityLabel="Sync workouts from Apple Health"
          >
            {isSyncing ? (
              <ActivityIndicator color={colors.accentBright} size="small" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={22} color={colors.accentBright} />
            )}
          </Pressable>
        </View>
      </View>

      {showSyncBar ? (
        <View className="mb-2 px-4">
          <Text
            className="text-xs"
            style={{
              color: syncHasIssue ? colors.warning : colors.textSecondary,
            }}
          >
            {lastSyncResult!.fetchError
              ? lastSyncResult!.fetchError
              : `${lastSyncResult!.synced} new · ${lastSyncResult!.skipped} already synced${
                  lastSyncResult!.errors > 0
                    ? ` · ${lastSyncResult!.errors} could not be saved`
                    : ""
                }`}
          </Text>
        </View>
      ) : null}

      {!hasPermissions && !hkLoading ? (
        <View className="mx-4 mb-3 rounded-xl border px-3 py-2" style={{ borderColor: colors.border }}>
          <Text className="text-sm" style={{ color: colors.textSecondary }}>
            Connect Apple Health to sync your workouts.
          </Text>
          <Pressable
            className="mt-2 self-start rounded-lg px-3 py-2 active:opacity-90"
            style={{ backgroundColor: colors.accent }}
            onPress={() => void runSync()}
          >
            <Text className="text-sm font-semibold text-white">Connect</Text>
          </Pressable>
        </View>
      ) : null}

      {listLoading && workouts.length === 0 ? (
        <View className="flex-1 items-center justify-center py-16">
          <ActivityIndicator color={colors.accentBright} />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={colors.accentBright}
            />
          }
        >
          {workouts.length === 0 ? (
            <View className="items-center py-12">
              <Text
                className="text-center text-sm leading-relaxed"
                style={{ color: colors.textSecondary }}
              >
                {hasPermissions
                  ? "No workouts found. Complete a workout and sync."
                  : "Connect Apple Health to see your workouts here."}
              </Text>
              <Pressable
                className="mt-4 rounded-[12px] px-4 py-3 active:opacity-90"
                style={{
                  backgroundColor: colors.accent,
                  borderWidth: 1,
                  borderColor: colors.accentBright,
                }}
                onPress={() => void runSync()}
              >
                <Text className="text-sm font-bold text-white">
                  {hasPermissions ? "Sync" : "Connect"}
                </Text>
              </Pressable>
            </View>
          ) : (
            workouts.map((w) => (
              <View key={w.id} className="mb-3">
                <Pressable
                  onPress={() => {
                    router.push(`/(tabs)/workouts/${w.id}`);
                  }}
                  className="active:opacity-90"
                >
                  <FrostedCard padding={14}>
                    <View className="mb-3 flex-row items-start justify-between">
                      <View className="flex-row items-center gap-2">
                        <Ionicons
                          name={iconForActivity(w.activity_type)}
                          size={22}
                          color={colors.accentBright}
                        />
                        <Text className="text-base font-semibold text-white">
                          {w.activity_type ?? "Workout"}
                        </Text>
                      </View>
                      {w.started_at ? (
                        <Text
                          className="text-xs"
                          style={{ color: colors.textTertiary }}
                        >
                          {formatDate(w.started_at)}
                        </Text>
                      ) : null}
                    </View>

                    <View className="mb-3 flex-row justify-between">
                      <View className="flex-1 items-center">
                        <Text
                          className="text-[10px] uppercase tracking-wide"
                          style={{ color: colors.textTertiary }}
                        >
                          Duration
                        </Text>
                        <Text className="mt-0.5 text-sm font-semibold text-white">
                          {formatDuration(Number(w.duration_seconds ?? 0))}
                        </Text>
                      </View>
                      <View className="flex-1 items-center">
                        <Text
                          className="text-[10px] uppercase tracking-wide"
                          style={{ color: colors.textTertiary }}
                        >
                          Distance
                        </Text>
                        <Text className="mt-0.5 text-sm font-semibold text-white">
                          {formatDistance(w.distance_meters)}
                        </Text>
                      </View>
                      <View className="flex-1 items-center">
                        <Text
                          className="text-[10px] uppercase tracking-wide"
                          style={{ color: colors.textTertiary }}
                        >
                          Calories
                        </Text>
                        <Text className="mt-0.5 text-sm font-semibold text-white">
                          {w.calories_burned != null
                            ? `${Math.round(Number(w.calories_burned))} kcal`
                            : "—"}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center justify-between border-t border-white/10 pt-2">
                      <View className="flex-row items-center gap-1">
                        {w.avg_heart_rate != null ? (
                          <>
                            <Ionicons
                              name="heart-outline"
                              size={14}
                              color={colors.textSecondary}
                            />
                            <Text
                              className="text-xs"
                              style={{ color: colors.textSecondary }}
                            >
                              {Math.round(Number(w.avg_heart_rate))} bpm
                            </Text>
                          </>
                        ) : (
                          <Text
                            className="text-xs"
                            style={{ color: colors.textTertiary }}
                          >
                            —
                          </Text>
                        )}
                      </View>
                      <View className="flex-row items-center gap-1">
                        <Text
                          className="max-w-[50%] text-right text-xs"
                          style={{ color: colors.textTertiary }}
                          numberOfLines={1}
                        >
                          {w.source === "healthkit"
                            ? (typeof w.raw_data === "object" &&
                                w.raw_data &&
                                "source_name" in w.raw_data &&
                                String(
                                  (w.raw_data as { source_name?: string })
                                    .source_name,
                                )) || "Apple Health"
                            : w.source}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                      </View>
                    </View>
                  </FrostedCard>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
