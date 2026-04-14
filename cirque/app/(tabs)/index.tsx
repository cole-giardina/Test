import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalorieRingHero } from "@/components/ui/CalorieRingHero";
import { FrostedCard } from "@/components/ui/FrostedCard";
import { MacroBar } from "@/components/ui/MacroBar";
import { RecommendationCard } from "@/components/ui/RecommendationCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { WorkoutRow } from "@/components/ui/WorkoutRow";
import { colors } from "@/constants/colors";
import { useDashboard } from "@/hooks/useDashboard";
import { formatFirstName, getGreeting } from "@/lib/formatters";

const AMBER = colors.warning;

const NA_TARGET = 1500;
const K_TARGET = 3500;
const MG_TARGET = 400;

function zeroTotals() {
  return {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    sodium_mg: 0,
    potassium_mg: 0,
    magnesium_mg: 0,
  };
}

function initialsFromName(name: string | null | undefined): string {
  const t = name?.trim();
  if (!t) {
    return "?";
  }
  const parts = t.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

export default function DashboardTab() {
  const insets = useSafeAreaInsets();
  const {
    data,
    isLoading,
    refresh,
    generateRefuel,
    setRecommendationFeedback,
    refuelCooldownRemainingSec,
  } = useDashboard();
  const [refreshing, setRefreshing] = useState(false);
  const [refuelBusy, setRefuelBusy] = useState(false);
  const [feedbackBusy, setFeedbackBusy] = useState(false);

  const profile = data.profile;
  const totals = data.dailyTotals ?? zeroTotals();
  const firstName = formatFirstName(profile?.display_name ?? "");
  const greetingName = firstName || "there";

  const headerDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const calorieGoal = profile?.daily_calorie_goal ?? null;
  const proteinGoal = profile?.daily_protein_g ?? 120;
  const carbGoal =
    calorieGoal != null && calorieGoal > 0 ? (calorieGoal * 0.5) / 4 : 0;
  const fatGoal =
    calorieGoal != null && calorieGoal > 0 ? (calorieGoal * 0.25) / 9 : 0;

  const showMacroBreakdown =
    profile != null &&
    profile.daily_calorie_goal != null &&
    profile.daily_calorie_goal > 0;

  const foodPreview = data.todaysFoodLogs.slice(0, 3);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  async function onGenerateRefuel() {
    if (refuelCooldownRemainingSec > 0) {
      return;
    }
    setRefuelBusy(true);
    try {
      await generateRefuel();
    } catch (e) {
      Alert.alert(
        "Could not generate advice",
        e instanceof Error ? e.message : "Try again in a moment.",
      );
    } finally {
      setRefuelBusy(false);
    }
  }

  async function onRecommendationFeedback(helpful: boolean) {
    const recommendation = data.latestRecommendation;
    if (!recommendation?.id) {
      return;
    }
    setFeedbackBusy(true);
    try {
      await setRecommendationFeedback(recommendation.id, helpful);
    } catch (e) {
      Alert.alert(
        "Could not save feedback",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setFeedbackBusy(false);
    }
  }

  const cooldownLabel =
    refuelCooldownRemainingSec > 0
      ? `Wait ${Math.ceil(refuelCooldownRemainingSec / 60)}m`
      : "Get advice";

  function goToLog() {
    router.push("/(tabs)/log");
  }

  return (
    <View
      className="flex-1 bg-brand-bg"
      style={{ paddingTop: insets.top }}
    >
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.accentBright} />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accentBright}
            />
          }
        >
          <View className="mb-5 flex-row items-start justify-between pt-2">
            <View className="max-w-[68%]">
              <Text
                className="font-bold text-white"
                style={{ fontSize: 22, lineHeight: 28 }}
              >
                {getGreeting()}, {greetingName}
              </Text>
              <Text
                className="mt-0.5 text-[13px]"
                style={{ color: colors.textSecondary }}
              >
                {headerDate}
              </Text>
            </View>
            <View
              className="h-11 w-11 items-center justify-center rounded-full border"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.accent,
              }}
            >
              <Text
                className="text-sm font-bold"
                style={{ color: colors.accentBright }}
              >
                {initialsFromName(profile?.display_name)}
              </Text>
            </View>
          </View>

          <View className="mb-5 items-center">
            <CalorieRingHero
              caloriesConsumed={totals.calories}
              calorieGoal={calorieGoal}
              proteinG={totals.protein_g}
              carbsG={totals.carbs_g}
              fatG={totals.fat_g}
            />
          </View>

          <View className="mb-5 flex-row gap-2">
            <StatCard
              label="Sodium"
              value={totals.sodium_mg}
              unit="mg"
              barPercent={(totals.sodium_mg / NA_TARGET) * 100}
              barColor={totals.sodium_mg <= NA_TARGET ? colors.sodium : AMBER}
              accentTop={colors.sodium}
            />
            <StatCard
              label="Potassium"
              value={totals.potassium_mg}
              unit="mg"
              barPercent={(totals.potassium_mg / K_TARGET) * 100}
              barColor={
                totals.potassium_mg <= K_TARGET ? colors.potassium : AMBER
              }
              accentTop={colors.potassium}
            />
            <StatCard
              label="Magnesium"
              value={totals.magnesium_mg}
              unit="mg"
              barPercent={(totals.magnesium_mg / MG_TARGET) * 100}
              barColor={
                totals.magnesium_mg <= MG_TARGET ? colors.magnesium : AMBER
              }
              accentTop={colors.magnesium}
            />
          </View>

          {showMacroBreakdown ? (
            <View className="mb-5">
              <FrostedCard>
                <Text
                  className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em]"
                  style={{ color: colors.textTertiary }}
                >
                  Macros
                </Text>
                <View className="gap-3">
                  <MacroBar
                    label="Protein"
                    value={totals.protein_g}
                    max={proteinGoal}
                    color={colors.accentBright}
                  />
                  <MacroBar
                    label="Carbs"
                    value={totals.carbs_g}
                    max={carbGoal}
                    color={colors.accentBright}
                  />
                  <MacroBar
                    label="Fat"
                    value={totals.fat_g}
                    max={fatGoal}
                    color={colors.accentBright}
                  />
                </View>
              </FrostedCard>
            </View>
          ) : null}

          <View className="mb-5">
            <SectionHeader title="Recent workouts" />
            {data.recentWorkouts.length === 0 ? (
              <FrostedCard>
                <Text
                  className="py-2 text-center text-sm leading-relaxed"
                  style={{ color: colors.textSecondary }}
                >
                  No workouts yet. Connect HealthKit or Strava to sync your training.
                </Text>
              </FrostedCard>
            ) : (
              data.recentWorkouts.map((w) => (
                <WorkoutRow key={w.id} workout={w} />
              ))
            )}
          </View>

          <View className="mb-5">
            <SectionHeader title="Today's food" actionLabel="See all" onAction={goToLog} />
            {foodPreview.length === 0 ? (
              <FrostedCard>
                <View className="items-center py-2">
                  <Text
                    className="mb-3 text-center text-sm"
                    style={{ color: colors.textSecondary }}
                  >
                    Nothing logged yet today
                  </Text>
                  <Pressable
                    className="rounded-[12px] px-5 py-3 active:opacity-90"
                    style={{
                      backgroundColor: colors.accent,
                      borderWidth: 1,
                      borderColor: colors.accentBright,
                    }}
                    onPress={goToLog}
                  >
                    <Text className="text-center text-sm font-bold text-white">
                      Log food
                    </Text>
                  </Pressable>
                </View>
              </FrostedCard>
            ) : (
              foodPreview.map((item) => (
                <View key={item.id} className="mb-3">
                  <FrostedCard padding={14}>
                    <View className="flex-row items-center justify-between gap-2">
                      <Text
                        className="mr-2 flex-1 text-[15px] text-white"
                        numberOfLines={1}
                      >
                        {item.description ?? "Meal"}
                      </Text>
                      <View className="flex-row items-center gap-2">
                        {item.meal_type ? (
                          <View
                            className="rounded-full border px-2 py-0.5"
                            style={{
                              backgroundColor: colors.surface,
                              borderColor: colors.accent,
                            }}
                          >
                            <Text
                              className="text-xs font-medium"
                              style={{ color: colors.accentBright }}
                            >
                              {item.meal_type}
                            </Text>
                          </View>
                        ) : null}
                        <Text
                          className="text-[18px] font-bold"
                          style={{ color: colors.accentBright }}
                        >
                          {Math.round(Number(item.calories ?? 0))}
                        </Text>
                      </View>
                    </View>
                  </FrostedCard>
                </View>
              ))
            )}
          </View>

          <View className="mb-5">
            <SectionHeader
              title="Your recommendation"
              actionLabel={refuelBusy ? undefined : cooldownLabel}
              onAction={
                refuelBusy || refuelCooldownRemainingSec > 0
                  ? undefined
                  : () => {
                      void onGenerateRefuel();
                    }
              }
            />
            {refuelBusy ? (
              <FrostedCard>
                <View className="flex-row items-center gap-3 py-2">
                  <ActivityIndicator color={colors.accentBright} />
                  <Text className="text-sm" style={{ color: colors.textSecondary }}>
                    Generating refuel guidance…
                  </Text>
                </View>
              </FrostedCard>
            ) : (
              <RecommendationCard
                recommendation={data.latestRecommendation}
                onFeedback={(helpful) => {
                  void onRecommendationFeedback(helpful);
                }}
                feedbackBusy={feedbackBusy}
              />
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
