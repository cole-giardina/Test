import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FrostedCard } from "@/components/ui/FrostedCard";
import { colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatDistance, formatDuration } from "@/lib/formatters";
import { generateRefuelAdvice } from "@/lib/refuel";
import { getWorkoutById } from "@/lib/workoutSync";
import type { Workout } from "@/types/database";

export default function WorkoutDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const workoutId = Array.isArray(id) ? id[0] : id;
  const { profile } = useAuth();
  const userId = profile?.id;

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [refuelBusy, setRefuelBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId || !workoutId) {
      setWorkout(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const row = await getWorkoutById(userId, workoutId);
      setWorkout(row);
    } catch (e) {
      console.error("[WorkoutDetail]", e);
      setWorkout(null);
    } finally {
      setLoading(false);
    }
  }, [userId, workoutId]);

  useEffect(() => {
    void load();
  }, [load]);

  function goLogMeal() {
    if (!workoutId) {
      return;
    }
    router.push({
      pathname: "/(tabs)/log",
      params: { workoutId },
    });
  }

  async function onRefuelThisWorkout() {
    if (!workoutId) {
      return;
    }
    setRefuelBusy(true);
    try {
      await generateRefuelAdvice({ workoutId });
      Alert.alert("Refuel", "New recommendation is on your Dashboard.");
      router.push("/(tabs)");
    } catch (e) {
      Alert.alert(
        "Could not generate advice",
        e instanceof Error ? e.message : "Try again shortly.",
      );
    } finally {
      setRefuelBusy(false);
    }
  }

  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-brand-bg"
        style={{ paddingTop: insets.top }}
      >
        <ActivityIndicator color={colors.accentBright} size="large" />
      </View>
    );
  }

  if (!workout) {
    return (
      <View
        className="flex-1 items-center justify-center bg-brand-bg px-6"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-center text-base" style={{ color: colors.textSecondary }}>
          Workout not found or you no longer have access.
        </Text>
        <Pressable
          className="mt-6 rounded-[12px] px-5 py-3 active:opacity-90"
          style={{ backgroundColor: colors.accent }}
          onPress={() => router.back()}
        >
          <Text className="font-semibold text-white">Back</Text>
        </Pressable>
      </View>
    );
  }

  const title = workout.activity_type?.trim() || "Workout";
  const elev =
    workout.elevation_gain_m != null && Number.isFinite(Number(workout.elevation_gain_m))
      ? `${Math.round(Number(workout.elevation_gain_m))} m`
      : "—";

  return (
    <ScrollView
      className="flex-1 bg-brand-bg"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: insets.bottom + 32,
      }}
    >
      <Text className="text-2xl font-bold text-white">{title}</Text>
      {workout.started_at ? (
        <Text className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
          {formatDate(workout.started_at)}
        </Text>
      ) : null}

      <View className="mt-6 gap-3">
        <FrostedCard padding={14}>
          <Text
            className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: colors.textTertiary }}
          >
            Session
          </Text>
          <View className="flex-row flex-wrap">
            <Stat label="Duration" value={formatDuration(Number(workout.duration_seconds ?? 0))} />
            <Stat label="Distance" value={formatDistance(workout.distance_meters)} />
            <Stat
              label="Energy"
              value={
                workout.calories_burned != null
                  ? `${Math.round(Number(workout.calories_burned))} kcal`
                  : "—"
              }
            />
            <Stat
              label="Avg HR"
              value={
                workout.avg_heart_rate != null
                  ? `${Math.round(Number(workout.avg_heart_rate))} bpm`
                  : "—"
              }
            />
            <Stat label="Elevation" value={elev} />
            <Stat label="Source" value={workout.source} />
          </View>
        </FrostedCard>

        <Pressable
          className="flex-row items-center justify-center gap-2 rounded-[12px] border py-3.5 active:opacity-90"
          style={{
            borderColor: colors.accentBright,
            backgroundColor: colors.surface,
          }}
          onPress={goLogMeal}
        >
          <Ionicons name="nutrition-outline" size={22} color={colors.accentBright} />
          <Text className="text-base font-semibold text-white">Log meal for this workout</Text>
        </Pressable>

        <Pressable
          disabled={refuelBusy}
          className="flex-row items-center justify-center gap-2 rounded-[12px] py-3.5 active:opacity-90"
          style={{ backgroundColor: colors.accent }}
          onPress={() => void onRefuelThisWorkout()}
        >
          {refuelBusy ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <>
              <Ionicons name="flash-outline" size={22} color={colors.textPrimary} />
              <Text className="text-base font-semibold text-white">Refuel advice for this session</Text>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="pr-2 pb-2" style={{ width: "50%" }}>
      <Text className="text-[10px] uppercase tracking-wide" style={{ color: colors.textTertiary }}>
        {label}
      </Text>
      <Text className="mt-0.5 text-sm font-semibold text-white">{value}</Text>
    </View>
  );
}
