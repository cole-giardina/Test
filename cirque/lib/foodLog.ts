import { supabase } from "@/lib/supabase";
import type { FoodLog } from "@/types/database";

export type SaveFoodLogEntry = {
  workout_id?: string;
  meal_type: string;
  description: string;
  source: "ai";
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sodium_mg: number;
  potassium_mg: number;
  magnesium_mg: number;
  logged_at: string;
  /** Persisted for list UI (low-confidence hint). */
  confidence?: "high" | "medium" | "low";
};

export type DailyNutritionTotals = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sodium_mg: number;
  potassium_mg: number;
  magnesium_mg: number;
};

/** Alias for dashboard / hooks */
export type DailyTotals = DailyNutritionTotals;

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function localDayBoundsFromDateString(date: string): { start: Date; end: Date } {
  const parts = date.split("-").map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid date string (use YYYY-MM-DD): ${date}`);
  }
  const [y, m, day] = parts;
  const start = new Date(y, m - 1, day, 0, 0, 0, 0);
  const end = new Date(y, m - 1, day, 23, 59, 59, 999);
  return { start, end };
}

/**
 * @param userId — `profiles.id` (FK on `food_logs.user_id`), not Supabase Auth uid.
 */
export async function saveFoodLog(
  userId: string,
  entry: SaveFoodLogEntry,
): Promise<FoodLog> {
  const { data, error } = await supabase
    .from("food_logs")
    .insert({
      user_id: userId,
      workout_id: entry.workout_id ?? null,
      meal_type: entry.meal_type,
      description: entry.description,
      source: entry.source,
      calories: entry.calories,
      protein_g: entry.protein_g,
      carbs_g: entry.carbs_g,
      fat_g: entry.fat_g,
      sodium_mg: entry.sodium_mg,
      potassium_mg: entry.potassium_mg,
      magnesium_mg: entry.magnesium_mg,
      logged_at: entry.logged_at,
      confidence: entry.confidence ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/**
 * @param userId — `profiles.id`
 */
export async function getTodaysFoodLogs(userId: string): Promise<FoodLog[]> {
  const now = new Date();
  const start = startOfLocalDay(now);
  const end = endOfLocalDay(now);

  const { data, error } = await supabase
    .from("food_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("logged_at", start.toISOString())
    .lte("logged_at", end.toISOString())
    .order("logged_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

/**
 * Sums macros and electrolytes for all logs on a calendar day (local `date` YYYY-MM-DD).
 * @param userId — `profiles.id`
 */
export async function getDailyTotals(
  userId: string,
  date: string,
): Promise<DailyNutritionTotals> {
  const { start, end } = localDayBoundsFromDateString(date);

  const { data, error } = await supabase
    .from("food_logs")
    .select(
      "calories, protein_g, carbs_g, fat_g, sodium_mg, potassium_mg, magnesium_mg",
    )
    .eq("user_id", userId)
    .gte("logged_at", start.toISOString())
    .lte("logged_at", end.toISOString());

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const totals: DailyNutritionTotals = {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    sodium_mg: 0,
    potassium_mg: 0,
    magnesium_mg: 0,
  };

  for (const row of rows) {
    totals.calories += Number(row.calories ?? 0);
    totals.protein_g += Number(row.protein_g ?? 0);
    totals.carbs_g += Number(row.carbs_g ?? 0);
    totals.fat_g += Number(row.fat_g ?? 0);
    totals.sodium_mg += Number(row.sodium_mg ?? 0);
    totals.potassium_mg += Number(row.potassium_mg ?? 0);
    totals.magnesium_mg += Number(row.magnesium_mg ?? 0);
  }

  return totals;
}
