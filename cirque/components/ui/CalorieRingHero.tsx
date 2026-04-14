import { Text, View } from "react-native";

import { MacroRing } from "@/components/ui/MacroRing";
import { colors } from "@/constants/colors";

type CalorieRingHeroProps = {
  caloriesConsumed: number;
  calorieGoal: number | null;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export function CalorieRingHero({
  caloriesConsumed,
  calorieGoal,
  proteinG,
  carbsG,
  fatG,
}: CalorieRingHeroProps) {
  const hasGoal = calorieGoal != null && calorieGoal > 0;
  const max = hasGoal ? calorieGoal! : 1;

  const center = (
    <View className="items-center justify-center px-1">
      <Text
        className="font-bold text-white"
        style={{ fontSize: 36, lineHeight: 42 }}
      >
        {Math.round(caloriesConsumed)}
        {hasGoal ? (
          <Text
            className="text-xl font-semibold"
            style={{ color: colors.textSecondary }}
          >
            {" "}
            / {Math.round(calorieGoal!)}
          </Text>
        ) : null}
      </Text>
      <Text
        className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: colors.textTertiary }}
      >
        kcal
      </Text>
    </View>
  );

  return (
    <View className="w-full max-w-[360px] self-center">
      <View className="items-center">
        <View className="mb-1 items-center">
          <Text
              className="text-[10px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: colors.textTertiary }}
          >
            Carbs
          </Text>
          <Text
            className="text-sm font-semibold"
            style={{ color: colors.textSecondary }}
          >
            {Math.round(carbsG)}g
          </Text>
        </View>

        <View className="flex-row items-center justify-center">
          <View className="w-[66px] items-center pr-1">
            <Text
              className="text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: colors.textTertiary }}
              numberOfLines={1}
            >
              Protein
            </Text>
            <Text
              className="text-sm font-semibold"
              style={{ color: colors.textSecondary }}
            >
              {Math.round(proteinG)}g
            </Text>
          </View>

          <MacroRing
            value={hasGoal ? caloriesConsumed : 0}
            max={max}
            color={colors.accentBright}
            label=""
            size={200}
            strokeWidth={18}
            trackColor={colors.border}
            centerContent={center}
          />

          <View className="w-[66px] items-center pl-1">
            <Text
              className="text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: colors.textTertiary }}
              numberOfLines={1}
            >
              Fat
            </Text>
            <Text
              className="text-sm font-semibold"
              style={{ color: colors.textSecondary }}
            >
              {Math.round(fatG)}g
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
