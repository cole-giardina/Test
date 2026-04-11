import AppleHealth from "apple-health";
import { useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FrostedCard } from "@/components/ui/FrostedCard";
import { colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";

export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();
  const [healthKitTesting, setHealthKitTesting] = useState(false);

  const displayName = profile?.display_name?.trim() || "Athlete";
  const sport = profile?.sport_type ?? "—";
  const weight =
    profile?.weight_kg != null ? `${profile.weight_kg} kg` : "—";
  const age = profile?.age != null ? `${profile.age}` : "—";
  const level = profile?.training_level ?? "—";

  return (
    <View
      className="flex-1 bg-brand-bg px-6"
      style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: insets.bottom }}
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
        className="mt-10 text-center text-sm leading-relaxed"
        style={{ color: colors.textSecondary }}
      >
        Goals, integrations, and account settings will live here in a future update.
      </Text>

      {Platform.OS === "ios" ? (
        <View className="mt-6">
          <Pressable
            className="rounded-[12px] border py-3 active:opacity-90"
            style={{ borderColor: colors.border }}
            disabled={healthKitTesting}
            onPress={async () => {
              setHealthKitTesting(true);
              try {
                const result = await AppleHealth.requestAuthorization({
                  read: [
                    "workoutType",
                    "activeEnergyBurned",
                    "heartRate",
                    "distanceWalkingRunning",
                    "distanceCycling",
                  ],
                  write: [],
                });
                console.log("HealthKit result:", result);
                Alert.alert("HealthKit", JSON.stringify(result));
              } catch (e) {
                console.error(e);
                Alert.alert("Error", String(e));
              } finally {
                setHealthKitTesting(false);
              }
            }}
          >
            <Text className="text-center text-sm font-semibold text-white">
              {healthKitTesting ? "Requesting…" : "Test HealthKit (temporary)"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View className="mt-auto pt-10">
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
    </View>
  );
}
