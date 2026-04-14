import { router, Stack } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FrostedCard } from "@/components/ui/FrostedCard";
import { colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { getTodayDateString } from "@/lib/formatters";
import { insertManualWorkout } from "@/lib/workoutSync";

const ACTIVITIES = [
  "Run",
  "Ride",
  "Swim",
  "Walk",
  "Strength",
  "Other",
] as const;

function parseDurationToSeconds(text: string): number {
  const t = text.trim().toLowerCase();
  const h = /(\d+)\s*h/.exec(t);
  const m = /(\d+)\s*m(?!s)/.exec(t);
  if (h || m) {
    const hs = h ? Number(h[1]) * 3600 : 0;
    const ms = m ? Number(m[1]) * 60 : 0;
    if (hs + ms > 0) {
      return hs + ms;
    }
  }
  const n = Number(t.replace(/[^\d.]/g, ""));
  if (Number.isFinite(n) && n > 0) {
    return Math.round(n * 60);
  }
  return 0;
}

export default function ManualWorkoutScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [activity, setActivity] = useState("");
  const [customActivity, setCustomActivity] = useState("");
  const [durationText, setDurationText] = useState("45");
  const [distanceKm, setDistanceKm] = useState("");
  const [kcal, setKcal] = useState("");
  const [hr, setHr] = useState("");
  const [elevM, setElevM] = useState("");
  const [busy, setBusy] = useState(false);

  const effectiveActivity =
    activity === "Other" ? customActivity.trim() : activity;

  async function onSave() {
    if (!profile?.id) {
      return;
    }
    const durSec = parseDurationToSeconds(durationText);
    if (!effectiveActivity) {
      Alert.alert("Activity", "Choose or enter an activity type.");
      return;
    }
    if (durSec < 60) {
      Alert.alert("Duration", "Enter duration (e.g. 45 for minutes, or 1h 20m).");
      return;
    }
    const now = new Date();
    const started = now.toISOString();
    setBusy(true);
    try {
      await insertManualWorkout(profile.id, {
        activity_type: effectiveActivity,
        duration_seconds: durSec,
        distance_meters:
          distanceKm.trim() !== ""
            ? Number(distanceKm) * 1000
            : null,
        calories_burned: kcal.trim() !== "" ? Number(kcal) : null,
        avg_heart_rate: hr.trim() !== "" ? Number(hr) : null,
        elevation_gain_m: elevM.trim() !== "" ? Number(elevM) : null,
        started_at: started,
      });
      router.back();
    } catch (e) {
      Alert.alert(
        "Could not save",
        e instanceof Error ? e.message : "Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () =>
            busy ? (
              <ActivityIndicator color={colors.accentBright} style={{ marginRight: 12 }} />
            ) : (
              <Pressable onPress={() => void onSave()} style={{ marginRight: 12 }}>
                <Text style={{ color: colors.accentBright, fontWeight: "600" }}>Save</Text>
              </Pressable>
            ),
        }}
      />
      <ScrollView
        className="flex-1 bg-brand-bg"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
          Add a session that did not sync from Apple Health or Strava. Date defaults to today (
          {getTodayDateString()}).
        </Text>

        <Text
          className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: colors.textTertiary }}
        >
          Activity
        </Text>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {ACTIVITIES.map((a) => {
            const on = activity === a;
            return (
              <Pressable
                key={a}
                onPress={() => setActivity(a)}
                className="rounded-full px-3 py-2"
                style={{
                  backgroundColor: on ? colors.accent : colors.surface,
                  borderWidth: 1,
                  borderColor: on ? colors.accentBright : colors.border,
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: on ? colors.textPrimary : colors.textSecondary }}
                >
                  {a}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {activity === "Other" ? (
          <FrostedCard className="mb-4" padding={12}>
            <TextInput
              className="text-base text-white"
              placeholder="Activity name"
              placeholderTextColor={colors.textTertiary}
              value={customActivity}
              onChangeText={setCustomActivity}
            />
          </FrostedCard>
        ) : null}

        <Text
          className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: colors.textTertiary }}
        >
          Duration
        </Text>
        <FrostedCard className="mb-4" padding={12}>
          <TextInput
            className="text-base text-white"
            placeholder="Minutes (e.g. 45) or 1h 20m"
            placeholderTextColor={colors.textTertiary}
            value={durationText}
            onChangeText={setDurationText}
            keyboardType="default"
          />
        </FrostedCard>

        <Text
          className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: colors.textTertiary }}
        >
          Optional details
        </Text>
        <FrostedCard padding={12}>
          <Field label="Distance (km)" value={distanceKm} onChange={setDistanceKm} keyboard="decimal-pad" />
          <View className="h-3" />
          <Field label="Calories (kcal)" value={kcal} onChange={setKcal} keyboard="number-pad" />
          <View className="h-3" />
          <Field label="Avg heart rate (bpm)" value={hr} onChange={setHr} keyboard="number-pad" />
          <View className="h-3" />
          <Field label="Elevation gain (m)" value={elevM} onChange={setElevM} keyboard="number-pad" />
        </FrostedCard>

        <Pressable
          disabled={busy}
          className="mt-6 items-center rounded-[12px] py-3.5 active:opacity-90"
          style={{ backgroundColor: colors.accent }}
          onPress={() => void onSave()}
        >
          <Text className="text-base font-semibold text-white">Save workout</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboard,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboard: "default" | "decimal-pad" | "number-pad";
}) {
  return (
    <View>
      <Text className="text-[10px] uppercase tracking-wide" style={{ color: colors.textTertiary }}>
        {label}
      </Text>
      <TextInput
        className="mt-1 border-b border-white/10 py-1 text-base text-white"
        placeholder="—"
        placeholderTextColor={colors.textTertiary}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
      />
    </View>
  );
}
