import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalorieRingHero } from "@/components/ui/CalorieRingHero";
import { MacroBar } from "@/components/ui/MacroBar";
import { RecommendationCard } from "@/components/ui/RecommendationCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { WorkoutRow } from "@/components/ui/WorkoutRow";
import { useDashboard } from "@/hooks/useDashboard";
import { formatFirstName, getGreeting } from "@/lib/formatters";

const BG = "#0a0a0a";
const SURFACE = "#1a1a1a";
const BRAND = "#00D4A0";
const AMBER = "#F59E0B";

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

export default function DashboardTab() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, refresh } = useDashboard();
  const [refreshing, setRefreshing] = useState(false);

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

  function goToLog() {
    router.push("/(tabs)/log");
  }

  return (
    <View className="flex-1" style={{ backgroundColor: BG, paddingTop: insets.top }}>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={BRAND} />
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
              tintColor={BRAND}
            />
          }
        >
          <View className="mb-5 flex-row items-start justify-between pt-2">
            <View className="max-w-[72%]">
              <Text
                className="font-bold text-white"
                style={{ fontSize: 20, lineHeight: 26 }}
              >
                {getGreeting()}, {greetingName}
              </Text>
            </View>
            <Text className="text-sm text-[#888888]">{headerDate}</Text>
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
              barColor={totals.sodium_mg <= NA_TARGET ? BRAND : AMBER}
            />
            <StatCard
              label="Potassium"
              value={totals.potassium_mg}
              unit="mg"
              barPercent={(totals.potassium_mg / K_TARGET) * 100}
              barColor={totals.potassium_mg <= K_TARGET ? BRAND : AMBER}
            />
            <StatCard
              label="Magnesium"
              value={totals.magnesium_mg}
              unit="mg"
              barPercent={(totals.magnesium_mg / MG_TARGET) * 100}
              barColor={totals.magnesium_mg <= MG_TARGET ? BRAND : AMBER}
            />
          </View>

          {showMacroBreakdown ? (
            <View className="mb-5 rounded-xl bg-[#1a1a1a] p-4" style={{ borderRadius: 12 }}>
              <Text
                className="mb-3 text-[13px] uppercase tracking-wide text-[#888888]"
                style={{ fontSize: 13 }}
              >
                Macros
              </Text>
              <View className="gap-3">
              <MacroBar
                label="Protein"
                value={totals.protein_g}
                max={proteinGoal}
                color="#22d3ee"
              />
              <MacroBar
                label="Carbs"
                value={totals.carbs_g}
                max={carbGoal}
                color="#fbbf24"
              />
              <MacroBar
                label="Fat"
                value={totals.fat_g}
                max={fatGoal}
                color="#fb7185"
              />
              </View>
            </View>
          ) : null}

          <View className="mb-5">
            <SectionHeader title="Recent workouts" />
            <View
              className="rounded-xl bg-[#1a1a1a] px-4 py-2"
              style={{ borderRadius: 12 }}
            >
              {data.recentWorkouts.length === 0 ? (
                <Text className="py-4 text-center text-sm leading-relaxed text-[#888888]">
                  No workouts yet. Connect HealthKit or Strava to sync your training.
                </Text>
              ) : (
                data.recentWorkouts.map((w) => (
                  <WorkoutRow key={w.id} workout={w} />
                ))
              )}
            </View>
          </View>

          <View className="mb-5">
            <SectionHeader title="Today's food" actionLabel="See all" onAction={goToLog} />
            <View
              className="rounded-xl bg-[#1a1a1a] px-4 py-3"
              style={{ borderRadius: 12 }}
            >
              {foodPreview.length === 0 ? (
                <View className="items-center py-2">
                  <Text className="mb-3 text-center text-sm text-[#888888]">
                    Nothing logged yet today
                  </Text>
                  <Pressable
                    className="rounded-xl bg-[#00D4A0] px-5 py-3 active:opacity-90"
                    onPress={goToLog}
                  >
                    <Text className="text-center text-sm font-semibold text-[#0a0a0a]">
                      Log food
                    </Text>
                  </Pressable>
                </View>
              ) : (
                foodPreview.map((item) => (
                  <View
                    key={item.id}
                    className="flex-row items-center justify-between border-b border-zinc-800/80 py-3 last:border-b-0"
                  >
                    <Text
                      className="mr-2 flex-1 text-base text-white"
                      numberOfLines={1}
                    >
                      {item.description ?? "Meal"}
                    </Text>
                    {item.meal_type ? (
                      <View className="mr-2 rounded-full bg-zinc-800 px-2 py-0.5">
                        <Text className="text-xs text-zinc-300">{item.meal_type}</Text>
                      </View>
                    ) : null}
                    <Text className="text-sm font-semibold text-[#00D4A0]">
                      {Math.round(Number(item.calories ?? 0))}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>

          <View className="mb-5">
            <SectionHeader title="Your recommendation" />
            <RecommendationCard recommendation={data.latestRecommendation} />
          </View>
        </ScrollView>
      )}
    </View>
  );
}
