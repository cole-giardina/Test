import { ActivityIndicator, Pressable, Text, View } from "react-native";

import type { ParsedFoodNutrition } from "@/lib/foodAI";

const confidenceStyles: Record<
  ParsedFoodNutrition["confidence"],
  { label: string; className: string }
> = {
  high: { label: "High confidence", className: "bg-emerald-500/20 text-emerald-300" },
  medium: {
    label: "Medium confidence",
    className: "bg-amber-500/20 text-amber-200",
  },
  low: { label: "Low confidence", className: "bg-red-500/20 text-red-300" },
};

type NutritionPreviewCardProps = {
  data: ParsedFoodNutrition;
  onSave: () => void;
  onEdit: () => void;
  saving?: boolean;
};

export function NutritionPreviewCard({
  data,
  onSave,
  onEdit,
  saving = false,
}: NutritionPreviewCardProps) {
  const conf = confidenceStyles[data.confidence];

  return (
    <View className="mb-3 rounded-2xl border border-zinc-800 bg-[#1a1a1a] p-4">
      <Text className="text-lg font-bold leading-snug text-zinc-50">
        {data.description}
      </Text>

      <View className="mt-2 flex-row flex-wrap items-center gap-2">
        <Text
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${conf.className}`}
        >
          {conf.label}
        </Text>
      </View>

      <Text className="mt-4 text-4xl font-bold tracking-tight text-[#00D4A0]">
        {Math.round(data.calories)}{" "}
        <Text className="text-lg font-semibold text-zinc-400">kcal</Text>
      </Text>

      <View className="mt-4 flex-row justify-between gap-2 border-t border-zinc-800 pt-4">
        <View className="flex-1">
          <Text className="text-[10px] uppercase text-zinc-500">Protein</Text>
          <Text className="text-base font-semibold text-zinc-100">
            {Math.round(data.protein_g)} g
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-[10px] uppercase text-zinc-500">Carbs</Text>
          <Text className="text-base font-semibold text-zinc-100">
            {Math.round(data.carbs_g)} g
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-[10px] uppercase text-zinc-500">Fat</Text>
          <Text className="text-base font-semibold text-zinc-100">
            {Math.round(data.fat_g)} g
          </Text>
        </View>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-1 border-t border-zinc-800 pt-3">
        <Text className="text-xs text-zinc-400">
          Na {Math.round(data.sodium_mg)} mg
        </Text>
        <Text className="text-xs text-zinc-400">
          K {Math.round(data.potassium_mg)} mg
        </Text>
        <Text className="text-xs text-zinc-400">
          Mg {Math.round(data.magnesium_mg)} mg
        </Text>
      </View>

      {data.notes?.trim() ? (
        <Text className="mt-3 text-xs italic leading-relaxed text-zinc-500">
          {data.notes.trim()}
        </Text>
      ) : null}

      <View className="mt-4 flex-row gap-3">
        <Pressable
          className="flex-1 rounded-xl border border-zinc-600 py-3 active:opacity-80"
          onPress={onEdit}
          disabled={saving}
        >
          <Text className="text-center text-base font-semibold text-zinc-200">
            Edit
          </Text>
        </Pressable>
        <Pressable
          className="flex-1 rounded-xl bg-[#00D4A0] py-3 active:opacity-90"
          onPress={onSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#0a0a0a" />
          ) : (
            <Text className="text-center text-base font-semibold text-[#0a0a0a]">
              Save
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
