import type { Profile } from "@/types/database";

/** Protein, carb, and fat gram targets derived from profile. Carbs = 50% of kcal goal, fat = 25% (same as dashboard). */
export type MacroTargets = {
  proteinGoalG: number;
  carbGoalG: number;
  fatGoalG: number;
  /** Set when `daily_calorie_goal` is present and positive; macro bars / rings use this. */
  hasCalorieTarget: boolean;
  dailyCalorieGoal: number | null;
};

export function getMacroTargetsForProfile(profile: Profile | null): MacroTargets {
  const cal = profile?.daily_calorie_goal;
  const hasCalorieTarget = cal != null && cal > 0;
  const proteinRaw = profile?.daily_protein_g ?? 120;
  const proteinGoalG =
    typeof proteinRaw === "number" ? proteinRaw : Number(proteinRaw) || 120;
  return {
    hasCalorieTarget,
    dailyCalorieGoal: hasCalorieTarget ? cal : null,
    proteinGoalG,
    carbGoalG: hasCalorieTarget ? (cal * 0.5) / 4 : 0,
    fatGoalG: hasCalorieTarget ? (cal * 0.25) / 9 : 0,
  };
}
