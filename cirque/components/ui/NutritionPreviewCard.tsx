import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { FrostedCard } from "@/components/ui/FrostedCard";
import { colors } from "@/constants/colors";
import type { ParsedFoodNutrition } from "@/lib/foodAI";

const confidenceStyles: Record<
  ParsedFoodNutrition["confidence"],
  { label: string; bg: string; text: string }
> = {
  high: {
    label: "High confidence",
    bg: colors.success,
    text: colors.textPrimary,
  },
  medium: {
    label: "Medium confidence",
    bg: colors.warning,
    text: colors.textPrimary,
  },
  low: {
    label: "Low confidence",
    bg: colors.danger,
    text: colors.textPrimary,
  },
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
    <FrostedCard accentTop={colors.accentGlow}>
      <Text className="text-lg font-bold leading-snug text-white">
        {data.description}
      </Text>

      <View className="mt-2 flex-row flex-wrap items-center gap-2">
        <View
          className="rounded-full px-2 py-0.5"
          style={{ backgroundColor: conf.bg }}
        >
          <Text
            className="text-xs font-semibold"
            style={{ color: conf.text }}
          >
            {conf.label}
          </Text>
        </View>
      </View>

      <Text className="mt-4 text-center text-4xl font-bold tracking-tight text-white">
        {Math.round(data.calories)}
      </Text>
      <Text
        className="text-center text-[11px] font-semibold uppercase tracking-[0.2em]"
        style={{ color: colors.textTertiary }}
      >
        kcal
      </Text>

      <View className="mt-4 flex-row gap-2">
        <View className="min-w-0 flex-1">
          <FrostedCard padding={10}>
            <Text
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: colors.textTertiary }}
            >
              Protein
            </Text>
            <Text className="mt-1 text-base font-semibold text-white">
              {Math.round(data.protein_g)} g
            </Text>
          </FrostedCard>
        </View>
        <View className="min-w-0 flex-1">
          <FrostedCard padding={10}>
            <Text
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: colors.textTertiary }}
            >
              Carbs
            </Text>
            <Text className="mt-1 text-base font-semibold text-white">
              {Math.round(data.carbs_g)} g
            </Text>
          </FrostedCard>
        </View>
        <View className="min-w-0 flex-1">
          <FrostedCard padding={10}>
            <Text
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: colors.textTertiary }}
            >
              Fat
            </Text>
            <Text className="mt-1 text-base font-semibold text-white">
              {Math.round(data.fat_g)} g
            </Text>
          </FrostedCard>
        </View>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-1">
        <Text className="text-xs" style={{ color: colors.textSecondary }}>
          Na {Math.round(data.sodium_mg)} mg
        </Text>
        <Text className="text-xs" style={{ color: colors.textSecondary }}>
          K {Math.round(data.potassium_mg)} mg
        </Text>
        <Text className="text-xs" style={{ color: colors.textSecondary }}>
          Mg {Math.round(data.magnesium_mg)} mg
        </Text>
      </View>

      {data.notes?.trim() ? (
        <Text
          className="mt-3 text-xs italic leading-relaxed"
          style={{ color: colors.textSecondary }}
        >
          {data.notes.trim()}
        </Text>
      ) : null}

      <View className="mt-4 flex-row gap-3">
        <Pressable
          className="flex-1 rounded-xl border py-3 active:opacity-80"
          style={{ borderColor: colors.border }}
          onPress={onEdit}
          disabled={saving}
        >
          <Text className="text-center text-base font-semibold text-white">
            Edit
          </Text>
        </Pressable>
        <Pressable
          className="flex-1 rounded-xl py-3 active:opacity-90"
          style={{
            backgroundColor: colors.accent,
            borderWidth: 1,
            borderColor: colors.accentBright,
          }}
          onPress={onSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <Text className="text-center text-base font-bold text-white">
              Save
            </Text>
          )}
        </Pressable>
      </View>
    </FrostedCard>
  );
}
