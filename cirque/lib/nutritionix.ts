import type { ParsedFoodNutrition } from "@/lib/foodAI";

const INSTANT_URL = "https://trackapi.nutritionix.com/v2/search/instant";
const NATURAL_URL = "https://trackapi.nutritionix.com/v2/natural/nutrients";

function getHeaders(): Record<string, string> {
  const appId = process.env.EXPO_PUBLIC_NUTRITIONIX_APP_ID?.trim() ?? "";
  const appKey = process.env.EXPO_PUBLIC_NUTRITIONIX_API_KEY?.trim() ?? "";
  return {
    "Content-Type": "application/json",
    "x-app-id": appId,
    "x-app-key": appKey,
  };
}

export function hasNutritionixConfig(): boolean {
  return Boolean(
    process.env.EXPO_PUBLIC_NUTRITIONIX_APP_ID?.trim() &&
      process.env.EXPO_PUBLIC_NUTRITIONIX_API_KEY?.trim(),
  );
}

export type InstantFoodItem = {
  food_name: string;
  nix_item_id?: string;
  brand_name?: string;
  serving_unit?: string;
};

type InstantResponse = {
  common?: Array<{ food_name: string; serving_unit?: string }>;
  branded?: Array<{
    food_name: string;
    nix_item_id?: string;
    brand_name?: string;
    serving_unit?: string;
  }>;
};

/**
 * Nutritionix instant search (common + branded foods).
 */
export async function instantSearch(query: string): Promise<InstantFoodItem[]> {
  const q = query.trim();
  if (!hasNutritionixConfig() || q.length < 2) {
    return [];
  }

  const res = await fetch(INSTANT_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ query: q }),
  });

  if (!res.ok) {
    console.warn("[nutritionix] instantSearch", res.status, await res.text());
    return [];
  }

  const json = (await res.json()) as InstantResponse;
  const out: InstantFoodItem[] = [];
  for (const c of json.common ?? []) {
    out.push({ food_name: c.food_name, serving_unit: c.serving_unit });
  }
  for (const b of json.branded ?? []) {
    out.push({
      food_name: b.food_name,
      nix_item_id: b.nix_item_id,
      brand_name: b.brand_name,
      serving_unit: b.serving_unit,
    });
  }
  return out.slice(0, 25);
}

type NaturalNutrientsFood = {
  food_name?: string;
  nf_calories?: number;
  nf_protein?: number;
  nf_total_carbohydrate?: number;
  nf_total_fat?: number;
  nf_sodium?: number;
  nf_potassium?: number;
  nf_magnesium?: number;
  full_nutrients?: Array<{ attr_id: number; value: number }>;
};

function valueFromFull(
  nutrients: NaturalNutrientsFood["full_nutrients"],
  attrId: number,
): number {
  if (!nutrients) {
    return 0;
  }
  const hit = nutrients.find((n) => n.attr_id === attrId);
  return hit?.value != null && Number.isFinite(hit.value) ? hit.value : 0;
}

/**
 * USDA attribute ids used by Nutritionix full_nutrients (when summary fields are missing).
 * Sodium 307, Potassium 306, Magnesium 304.
 */
function mapFoodToParsed(food: NaturalNutrientsFood): ParsedFoodNutrition {
  const sodium =
    food.nf_sodium ??
    valueFromFull(food.full_nutrients, 307);
  const potassium =
    food.nf_potassium ??
    valueFromFull(food.full_nutrients, 306);
  const magnesium =
    food.nf_magnesium ??
    valueFromFull(food.full_nutrients, 304);

  return {
    description: food.food_name ?? "Food",
    calories: Number(food.nf_calories ?? 0),
    protein_g: Number(food.nf_protein ?? 0),
    carbs_g: Number(food.nf_total_carbohydrate ?? 0),
    fat_g: Number(food.nf_total_fat ?? 0),
    sodium_mg: sodium,
    potassium_mg: potassium,
    magnesium_mg: magnesium,
    confidence: "high",
    notes: "Nutritionix database",
  };
}

/**
 * Resolves a natural-language line (e.g. food name or serving) into structured macros.
 */
export async function nutrientsFromNaturalQuery(
  query: string,
): Promise<ParsedFoodNutrition> {
  const q = query.trim();
  if (!hasNutritionixConfig()) {
    throw new Error(
      "Nutritionix is not configured. Add EXPO_PUBLIC_NUTRITIONIX_APP_ID and EXPO_PUBLIC_NUTRITIONIX_API_KEY to .env.local.",
    );
  }
  if (q.length < 2) {
    throw new Error("Choose a food with a bit more detail.");
  }

  const res = await fetch(NATURAL_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ query: q }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.warn("[nutritionix] natural", res.status, t);
    throw new Error("Could not load nutrition data. Try another food.");
  }

  const json = (await res.json()) as { foods?: NaturalNutrientsFood[] };
  const food = json.foods?.[0];
  if (!food) {
    throw new Error("No nutrition data returned for that food.");
  }

  return mapFoodToParsed(food);
}
