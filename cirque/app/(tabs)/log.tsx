import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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

import { MacroRing } from "@/components/ui/MacroRing";
import { NutritionPreviewCard } from "@/components/ui/NutritionPreviewCard";
import { useAuth } from "@/hooks/useAuth";
import { parseFoodEntry } from "@/lib/foodAI";
import { getTodaysFoodLogs, saveFoodLog } from "@/lib/foodLog";
import type { ParsedFoodNutrition } from "@/lib/foodAI";
import type { FoodLog, Profile } from "@/types/database";

const BG = "#0a0a0a";
const SURFACE = "#1a1a1a";
const BRAND = "#00D4A0";

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
    <View className="mb-3 rounded-2xl border border-zinc-800 p-4" style={{ backgroundColor: SURFACE }}>
      <View className="flex-row items-start justify-between gap-2">
        <Text className="flex-1 text-base font-semibold leading-snug text-zinc-100">
          {item.description ?? "Meal"}
        </Text>
        {item.meal_type ? (
          <View className="rounded-full bg-zinc-800 px-2 py-0.5">
            <Text className="text-xs font-medium text-zinc-300">{item.meal_type}</Text>
          </View>
        ) : null}
      </View>

      {lowConfidence ? (
        <Text className="mt-1 text-xs text-amber-400/90">Low confidence estimate</Text>
      ) : null}

      <Text className="mt-3 text-3xl font-bold text-[#00D4A0]">
        {Math.round(Number(item.calories ?? 0))}{" "}
        <Text className="text-sm font-semibold text-zinc-500">kcal</Text>
      </Text>

      <View className="mt-3 flex-row gap-6">
        <Text className="text-sm text-zinc-400">
          P <Text className="font-semibold text-zinc-200">{Math.round(Number(item.protein_g ?? 0))}g</Text>
        </Text>
        <Text className="text-sm text-zinc-400">
          C <Text className="font-semibold text-zinc-200">{Math.round(Number(item.carbs_g ?? 0))}g</Text>
        </Text>
        <Text className="text-sm text-zinc-400">
          F <Text className="font-semibold text-zinc-200">{Math.round(Number(item.fat_g ?? 0))}g</Text>
        </Text>
      </View>

      <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1">
        <Text className="text-xs text-zinc-500">
          Na {Math.round(Number(item.sodium_mg ?? 0))} mg
        </Text>
        <Text className="text-xs text-zinc-500">
          K {Math.round(Number(item.potassium_mg ?? 0))} mg
        </Text>
        <Text className="text-xs text-zinc-500">
          Mg {Math.round(Number(item.magnesium_mg ?? 0))} mg
        </Text>
      </View>

      <Text className="mt-2 text-xs text-zinc-600">{formatLogTime(item.logged_at)}</Text>
    </View>
  );
}

export default function LogTab() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

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

  const goals = useMemo(() => getMacroGoals(profile), [profile]);
  const totals = useMemo(() => sumTotalsFromLogs(todaysLogs), [todaysLogs]);

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

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: BG }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <View
        className="flex-1 px-4 pt-2"
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      >
        <View className="pb-3">
          <Text className="text-2xl font-bold tracking-tight text-zinc-50">
            Log food
          </Text>
          <Text className="mt-1 text-sm text-zinc-500">{formatHeaderDate()}</Text>
        </View>

        <Text className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Meal type
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
                  backgroundColor: selected ? BRAND : SURFACE,
                  borderWidth: selected ? 0 : 1,
                  borderColor: "#27272a",
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: selected ? "#0a0a0a" : "#d4d4d8" }}
                >
                  {m}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Today
        </Text>

        <View className="min-h-[180px] flex-1">
          {listLoading ? (
            <View className="flex-1 items-center justify-center py-12">
              <ActivityIndicator color={BRAND} />
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
                  <Text className="text-center text-base text-zinc-500">
                    Nothing logged yet today. What have you eaten?
                  </Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {showSummary ? (
          <View
            className="rounded-2xl border border-zinc-800 px-3 py-3"
            style={{ backgroundColor: SURFACE }}
          >
            <View className="mb-3 flex-row items-end justify-between">
              <Text className="text-xs uppercase text-zinc-500">Today</Text>
              <Text className="text-lg font-bold text-zinc-50">
                {Math.round(totals.calories)}
                <Text className="text-sm font-normal text-zinc-500">
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
                color="#22d3ee"
              />
              <MacroRing
                label="C"
                value={totals.carbs_g}
                max={goals.carbGoal}
                color="#fbbf24"
              />
              <MacroRing
                label="F"
                value={totals.fat_g}
                max={goals.fatGoal}
                color="#fb7185"
              />
            </View>
          </View>
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
          <Text className="mb-2 rounded-lg bg-red-950/80 px-3 py-2 text-sm text-red-200">
            {error}
          </Text>
        ) : null}

        {analyzing ? (
          <View className="mb-2 flex-row items-center gap-2 px-1">
            <ActivityIndicator color={BRAND} size="small" />
            <Text className="text-sm text-zinc-400">Analyzing…</Text>
          </View>
        ) : null}

        <View className="mt-1 flex-row items-end gap-2 border-t border-zinc-800/80 pt-3">
          <TextInput
            ref={inputRef}
            className="max-h-32 min-h-[48px] flex-1 rounded-xl border border-zinc-800 px-3 py-3 text-base text-zinc-100"
            style={{ backgroundColor: SURFACE }}
            placeholder="What did you eat? e.g. 'big bowl of oatmeal with banana and almond butter' or '3 scrambled eggs and toast with avocado'"
            placeholderTextColor="#71717a"
            multiline
            editable={!analyzing && !saving}
            value={inputText}
            onChangeText={setInputText}
          />
          <Pressable
            className="mb-0.5 h-12 w-12 items-center justify-center rounded-full active:opacity-80"
            style={{ backgroundColor: BRAND }}
            onPress={handleAnalyze}
            disabled={analyzing || saving || inputText.trim().length < 3}
          >
            {analyzing ? (
              <ActivityIndicator color="#0a0a0a" size="small" />
            ) : (
              <Ionicons name="arrow-up" size={22} color="#0a0a0a" />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
