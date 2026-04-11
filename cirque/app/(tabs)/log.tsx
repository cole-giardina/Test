import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FrostedCard } from "@/components/ui/FrostedCard";
import { MacroRing } from "@/components/ui/MacroRing";
import { NutritionPreviewCard } from "@/components/ui/NutritionPreviewCard";
import { colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { parseFoodEntry } from "@/lib/foodAI";
import { getTodaysFoodLogs, saveFoodLog } from "@/lib/foodLog";
import type { ParsedFoodNutrition } from "@/lib/foodAI";
import type { FoodLog, Profile } from "@/types/database";

const MEAL_TYPES = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack",
  "Pre-workout",
  "Post-workout",
  "Recovery",
] as const;

function getDefaultMealTypeForNow(): string {
  const h = new Date().getHours();
  if (h < 10) {
    return "Breakfast";
  }
  if (h < 12) {
    return "Snack";
  }
  if (h < 14) {
    return "Lunch";
  }
  if (h < 17) {
    return "Snack";
  }
  if (h < 20) {
    return "Dinner";
  }
  return "Recovery";
}

function formatHeaderDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatLogTime(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getMacroGoals(profile: Profile | null) {
  const calorieGoal = profile?.daily_calorie_goal ?? 2200;
  const proteinGoal = profile?.daily_protein_g ?? 120;
  const carbGoal = Math.round((calorieGoal * 0.45) / 4);
  const fatGoal = Math.round((calorieGoal * 0.3) / 9);
  return { calorieGoal, proteinGoal, carbGoal, fatGoal };
}

function sumTotalsFromLogs(logs: FoodLog[]) {
  const t = {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    sodium_mg: 0,
    potassium_mg: 0,
    magnesium_mg: 0,
  };
  for (const row of logs) {
    t.calories += Number(row.calories ?? 0);
    t.protein_g += Number(row.protein_g ?? 0);
    t.carbs_g += Number(row.carbs_g ?? 0);
    t.fat_g += Number(row.fat_g ?? 0);
    t.sodium_mg += Number(row.sodium_mg ?? 0);
    t.potassium_mg += Number(row.potassium_mg ?? 0);
    t.magnesium_mg += Number(row.magnesium_mg ?? 0);
  }
  return t;
}

function FoodEntryCard({ item }: { item: FoodLog }) {
  const lowConfidence = item.confidence === "low";
  return (
    <View className="mb-3">
      <FrostedCard padding={14}>
        <View className="flex-row items-start justify-between gap-2">
          <Text className="flex-1 text-[15px] font-semibold leading-snug text-white">
            {item.description ?? "Meal"}
          </Text>
          <Text
            className="text-[18px] font-bold"
            style={{ color: colors.accentBright }}
          >
            {Math.round(Number(item.calories ?? 0))}
          </Text>
        </View>

        {item.meal_type ? (
          <View className="mt-2 flex-row flex-wrap gap-2">
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
          </View>
        ) : null}

        {lowConfidence ? (
          <Text
            className="mt-1 text-xs"
            style={{ color: colors.warning }}
          >
            Low confidence estimate
          </Text>
        ) : null}

        <View className="mt-3 flex-row gap-6">
          <Text className="text-xs" style={{ color: colors.textSecondary }}>
            P{" "}
            <Text className="font-semibold text-white">
              {Math.round(Number(item.protein_g ?? 0))}g
            </Text>
          </Text>
          <Text className="text-xs" style={{ color: colors.textSecondary }}>
            C{" "}
            <Text className="font-semibold text-white">
              {Math.round(Number(item.carbs_g ?? 0))}g
            </Text>
          </Text>
          <Text className="text-xs" style={{ color: colors.textSecondary }}>
            F{" "}
            <Text className="font-semibold text-white">
              {Math.round(Number(item.fat_g ?? 0))}g
            </Text>
          </Text>
        </View>

        <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1">
          <Text className="text-[11px]" style={{ color: colors.textTertiary }}>
            Na {Math.round(Number(item.sodium_mg ?? 0))} mg
          </Text>
          <Text className="text-[11px]" style={{ color: colors.textTertiary }}>
            K {Math.round(Number(item.potassium_mg ?? 0))} mg
          </Text>
          <Text className="text-[11px]" style={{ color: colors.textTertiary }}>
            Mg {Math.round(Number(item.magnesium_mg ?? 0))} mg
          </Text>
        </View>

        <Text
          className="mt-2 text-[11px]"
          style={{ color: colors.textTertiary }}
        >
          {formatLogTime(item.logged_at)}
        </Text>
      </FrostedCard>
    </View>
  );
}

export default function LogTab() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const analyzePulse = useRef(new Animated.Value(1)).current;

  const [mealType, setMealType] = useState(getDefaultMealTypeForNow);
  const [inputText, setInputText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    data: ParsedFoodNutrition;
    rawText: string;
  } | null>(null);
  const [todaysLogs, setTodaysLogs] = useState<FoodLog[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const goals = useMemo(() => getMacroGoals(profile), [profile]);
  const totals = useMemo(() => sumTotalsFromLogs(todaysLogs), [todaysLogs]);

  useEffect(() => {
    if (!analyzing) {
      analyzePulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(analyzePulse, {
          toValue: 0.35,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(analyzePulse, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [analyzing, analyzePulse]);

  const loadLogs = useCallback(async () => {
    if (!profile?.id) {
      setTodaysLogs([]);
      setListLoading(false);
      return;
    }
    setListLoading(true);
    try {
      const rows = await getTodaysFoodLogs(profile.id);
      setTodaysLogs(rows);
    } catch (e) {
      console.error("[Log] loadLogs", e);
      setTodaysLogs([]);
    } finally {
      setListLoading(false);
    }
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadLogs();
    }, [loadLogs]),
  );

  async function handleAnalyze() {
    const text = inputText.trim();
    if (text.length < 3) {
      setError("Add a bit more detail (at least 3 characters).");
      return;
    }
    setError(null);
    setAnalyzing(true);
    try {
      const data = await parseFoodEntry(text, mealType);
      setPreview({ data, rawText: inputText });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not analyze food.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSavePreview() {
    if (!profile?.id || !preview) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveFoodLog(profile.id, {
        meal_type: mealType,
        description: preview.data.description,
        source: "ai",
        calories: preview.data.calories,
        protein_g: preview.data.protein_g,
        carbs_g: preview.data.carbs_g,
        fat_g: preview.data.fat_g,
        sodium_mg: preview.data.sodium_mg,
        potassium_mg: preview.data.potassium_mg,
        magnesium_mg: preview.data.magnesium_mg,
        logged_at: new Date().toISOString(),
        confidence: preview.data.confidence,
      });
      setPreview(null);
      setInputText("");
      await loadLogs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save entry.");
    } finally {
      setSaving(false);
    }
  }

  function handleEditPreview() {
    if (preview) {
      setInputText(preview.rawText);
    }
    setPreview(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  const showSummary = todaysLogs.length > 0;
  const inputBorder = inputFocused ? colors.accent : "rgba(42, 69, 96, 0.6)";

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-brand-bg"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <View
        className="flex-1 px-4 pt-2"
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      >
        <View className="pb-3">
          <Text className="text-2xl font-bold tracking-tight text-white">
            Log food
          </Text>
          <Text
            className="mt-1 text-sm"
            style={{ color: colors.textSecondary }}
          >
            {formatHeaderDate()}
          </Text>
        </View>

        <Text
          className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: colors.textTertiary }}
        >
          MEAL TYPE
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4 max-h-11 flex-grow-0"
          contentContainerStyle={{ gap: 8, paddingRight: 8 }}
        >
          {MEAL_TYPES.map((m) => {
            const selected = mealType === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMealType(m)}
                className="rounded-full px-4 py-2"
                style={{
                  backgroundColor: selected ? colors.accent : colors.surface,
                  borderWidth: 1,
                  borderColor: selected ? colors.accentBright : colors.border,
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{
                    color: selected ? colors.textPrimary : colors.textSecondary,
                  }}
                >
                  {m}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text
          className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: colors.textTertiary }}
        >
          TODAY
        </Text>

        <View className="min-h-[180px] flex-1">
          {listLoading ? (
            <View className="flex-1 items-center justify-center py-12">
              <ActivityIndicator color={colors.accentBright} />
            </View>
          ) : (
            <FlatList
              data={todaysLogs}
              keyExtractor={(it) => it.id}
              renderItem={({ item }) => <FoodEntryCard item={item} />}
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingBottom: 12,
                flexGrow: 1,
              }}
              ListEmptyComponent={
                <View className="items-center justify-center py-12">
                  <Text
                    className="text-center text-base"
                    style={{ color: colors.textSecondary }}
                  >
                    Nothing logged yet today. What have you eaten?
                  </Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {showSummary ? (
          <FrostedCard className="mb-3">
            <View className="mb-3 flex-row items-end justify-between">
              <Text
                className="text-[11px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: colors.textTertiary }}
              >
                TODAY
              </Text>
              <Text className="text-lg font-bold text-white">
                {Math.round(totals.calories)}
                <Text
                  className="text-sm font-normal"
                  style={{ color: colors.textSecondary }}
                >
                  {" "}
                  / {goals.calorieGoal} kcal
                </Text>
              </Text>
            </View>
            <View className="flex-row justify-around">
              <MacroRing
                label="P"
                value={totals.protein_g}
                max={goals.proteinGoal}
                color={colors.accentBright}
                trackColor={colors.border}
              />
              <MacroRing
                label="C"
                value={totals.carbs_g}
                max={goals.carbGoal}
                color={colors.accentBright}
                trackColor={colors.border}
              />
              <MacroRing
                label="F"
                value={totals.fat_g}
                max={goals.fatGoal}
                color={colors.accentBright}
                trackColor={colors.border}
              />
            </View>
          </FrostedCard>
        ) : null}

        {preview ? (
          <NutritionPreviewCard
            data={preview.data}
            onSave={handleSavePreview}
            onEdit={handleEditPreview}
            saving={saving}
          />
        ) : null}

        {error ? (
          <Text className="mb-2 text-sm" style={{ color: colors.danger }}>
            {error}
          </Text>
        ) : null}

        {analyzing ? (
          <Animated.View
            className="mb-2 flex-row items-center gap-2 px-1"
            style={{ opacity: analyzePulse }}
          >
            <ActivityIndicator color={colors.accentBright} size="small" />
            <Text className="text-sm" style={{ color: colors.textSecondary }}>
              Analyzing…
            </Text>
          </Animated.View>
        ) : null}

        <View className="mt-1 flex-row items-end gap-2 pt-3">
          <FrostedCard
            padding={0}
            className="min-h-[48px] flex-1"
            style={{ borderColor: inputBorder }}
          >
            <TextInput
              ref={inputRef}
              className="max-h-32 min-h-[48px] px-3 py-3 text-base text-white"
              placeholder="What did you eat? e.g. 'big bowl of oatmeal with banana and almond butter' or '3 scrambled eggs and toast with avocado'"
              placeholderTextColor={colors.textTertiary}
              style={{ fontStyle: "italic" }}
              multiline
              editable={!analyzing && !saving}
              value={inputText}
              onChangeText={setInputText}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
            />
          </FrostedCard>
          <Pressable
            className="mb-0.5 h-12 w-12 items-center justify-center rounded-full active:opacity-80"
            style={{
              backgroundColor: colors.accent,
              borderWidth: 1,
              borderColor: colors.accentBright,
            }}
            onPress={handleAnalyze}
            disabled={analyzing || saving || inputText.trim().length < 3}
          >
            {analyzing ? (
              <ActivityIndicator color={colors.textPrimary} size="small" />
            ) : (
              <Ionicons name="arrow-up" size={22} color={colors.textPrimary} />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
