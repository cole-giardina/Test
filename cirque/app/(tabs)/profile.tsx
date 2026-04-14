import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FrostedCard } from "@/components/ui/FrostedCard";
import { colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { useHealthKit } from "@/hooks/useHealthKit";
import { hasStravaConfig } from "@/lib/stravaConfig";

export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const { profile, signOut, refreshProfile } = useAuth();
  const {
    hasPermissions,
    isSyncing,
    lastSyncAt,
    lastSyncResult,
    requestPermissions,
    syncWorkouts,
  } = useHealthKit({ profileUserId: profile?.id });
  const [syncBusy, setSyncBusy] = useState(false);
  const [stravaBusy, setStravaBusy] = useState(false);
  const [stravaError, setStravaError] = useState<string | null>(null);

  const displayName = profile?.display_name?.trim() || "Athlete";
  const sport = profile?.sport_type ?? "—";
  const weight =
    profile?.weight_kg != null ? `${profile.weight_kg} kg` : "—";
  const age = profile?.age != null ? `${profile.age}` : "—";
  const level = profile?.training_level ?? "—";

  async function handleSyncWorkouts() {
    if (!profile?.id) {
      return;
    }
    setSyncBusy(true);
    try {
      if (!hasPermissions) {
        await requestPermissions();
      }
      await syncWorkouts(profile.id);
    } finally {
      setSyncBusy(false);
    }
  }

  async function handleConnectStrava() {
    setStravaError(null);
    setStravaBusy(true);
    try {
      const { connectStravaAccount } = await import("@/lib/strava");
      await connectStravaAccount();
      await refreshProfile();
    } catch (e) {
      setStravaError(
        e instanceof Error ? e.message : "Strava connection failed.",
      );
    } finally {
      setStravaBusy(false);
    }
  }

  async function handleSyncStrava() {
    setStravaError(null);
    setStravaBusy(true);
    try {
      const { syncStravaWorkouts } = await import("@/lib/strava");
      await syncStravaWorkouts();
    } catch (e) {
      setStravaError(
        e instanceof Error ? e.message : "Strava sync failed.",
      );
    } finally {
      setStravaBusy(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-brand-bg"
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: Math.max(insets.top, 16),
        paddingBottom: insets.bottom + 24,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-3xl font-bold text-white">{displayName}</Text>
      <Text className="mt-1 text-base" style={{ color: colors.textSecondary }}>
        {sport}
      </Text>

      <View className="mt-10 flex-row gap-3">
        <View className="min-w-0 flex-1">
          <FrostedCard padding={12}>
            <Text
              className="text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: colors.textTertiary }}
            >
              Weight
            </Text>
            <Text className="mt-1 text-lg font-bold text-white">{weight}</Text>
          </FrostedCard>
        </View>
        <View className="min-w-0 flex-1">
          <FrostedCard padding={12}>
            <Text
              className="text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: colors.textTertiary }}
            >
              Age
            </Text>
            <Text className="mt-1 text-lg font-bold text-white">{age}</Text>
          </FrostedCard>
        </View>
        <View className="min-w-0 flex-1">
          <FrostedCard padding={12}>
            <Text
              className="text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: colors.textTertiary }}
            >
              Level
            </Text>
            <Text
              className="mt-1 text-lg font-bold leading-tight text-white"
              numberOfLines={2}
            >
              {level}
            </Text>
          </FrostedCard>
        </View>
      </View>

      <Text
        className="mt-10 text-[11px] font-semibold uppercase tracking-[0.2em]"
        style={{ color: colors.textTertiary }}
      >
        Health & sync
      </Text>
      <FrostedCard className="mt-2">
        <Text className="text-sm text-white">
          Apple Health:{" "}
          <Text style={{ color: colors.accentBright }}>
            {hasPermissions ? "Connected" : "Not connected"}
          </Text>
        </Text>
        {lastSyncAt ? (
          <View className="mt-2">
            <Text
              className="text-xs"
              style={{ color: colors.textSecondary }}
            >
              Last sync: {lastSyncAt.toLocaleString()}
            </Text>
            {lastSyncResult ? (
              <Text
                className="mt-1 text-xs"
                style={{
                  color:
                    lastSyncResult.fetchError || lastSyncResult.errors > 0
                      ? colors.warning
                      : colors.textSecondary,
                }}
              >
                {lastSyncResult.fetchError ??
                  `${lastSyncResult.synced} new · ${lastSyncResult.skipped} already in Cirque${
                    lastSyncResult.errors > 0
                      ? ` · ${lastSyncResult.errors} failed to save`
                      : ""
                  }`}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text
            className="mt-2 text-xs"
            style={{ color: colors.textSecondary }}
          >
            Workouts sync when you open the app or tap below.
          </Text>
        )}
        <Text
          className="mt-3 text-xs leading-relaxed"
          style={{ color: colors.textTertiary }}
        >
          If workouts or heart rate are missing: iPhone Settings → Health → Data
          Access & Devices → Cirque → turn on Workouts, Heart Rate, and Active
          Energy (and Distance if listed).
        </Text>
        <Pressable
          className="mt-4 flex-row items-center justify-center rounded-[12px] py-3 active:opacity-90"
          style={{
            backgroundColor: colors.accent,
            borderWidth: 1,
            borderColor: colors.accentBright,
          }}
          disabled={syncBusy || isSyncing || !profile?.id}
          onPress={() => void handleSyncWorkouts()}
        >
          {syncBusy || isSyncing ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <Text className="text-center text-sm font-bold text-white">
              Sync workouts
            </Text>
          )}
        </Pressable>
      </FrostedCard>

      {hasStravaConfig() ? (
        <>
          <Text
            className="mt-8 text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: colors.textTertiary }}
          >
            Strava
          </Text>
          <FrostedCard className="mt-2">
            <Text className="text-sm text-white">
              Status:{" "}
              <Text style={{ color: colors.accentBright }}>
                {profile?.strava_linked ? "Connected" : "Not connected"}
              </Text>
            </Text>
            {stravaError ? (
              <Text
                className="mt-2 text-xs"
                style={{ color: colors.warning }}
              >
                {stravaError}
              </Text>
            ) : null}
            <View className="mt-4 flex-row flex-wrap gap-2">
              <Pressable
                className="min-w-[140px] flex-1 flex-row items-center justify-center rounded-[12px] py-3 active:opacity-90"
                style={{
                  backgroundColor: colors.accent,
                  borderWidth: 1,
                  borderColor: colors.accentBright,
                }}
                disabled={stravaBusy || !profile?.id}
                onPress={() => void handleConnectStrava()}
              >
                {stravaBusy ? (
                  <ActivityIndicator color={colors.textPrimary} />
                ) : (
                  <Text className="text-center text-sm font-bold text-white">
                    {profile?.strava_linked ? "Reconnect" : "Connect Strava"}
                  </Text>
                )}
              </Pressable>
              <Pressable
                className="min-w-[140px] flex-1 flex-row items-center justify-center rounded-[12px] border py-3 active:opacity-90"
                style={{ borderColor: colors.border }}
                disabled={stravaBusy || !profile?.strava_linked}
                onPress={() => void handleSyncStrava()}
              >
                <Text
                  className="text-center text-sm font-semibold text-white"
                  style={{
                    opacity: profile?.strava_linked ? 1 : 0.45,
                  }}
                >
                  Sync activities
                </Text>
              </Pressable>
            </View>
          </FrostedCard>
        </>
      ) : null}

      <Text
        className="mt-10 text-center text-sm leading-relaxed"
        style={{ color: colors.textSecondary }}
      >
        Goals, integrations, and account settings will live here in a future update.
      </Text>

      <View className="mt-10">
        <Pressable
          className="rounded-[12px] border py-4 active:opacity-90"
          style={{ borderColor: `${colors.danger}55` }}
          onPress={() => void signOut()}
        >
          <Text
            className="text-center text-base font-semibold"
            style={{ color: colors.danger }}
          >
            Sign out
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
