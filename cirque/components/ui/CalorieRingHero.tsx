import { Text, View } from "react-native";

import { MacroRing } from "@/components/ui/MacroRing";

const BRAND = "#00D4A0";

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
      <Text className="text-3xl font-bold text-white">
        {Math.round(caloriesConsumed)}
        {hasGoal ? (
          <Text className="text-xl font-semibold text-[#888888]">
            {" "}
            / {Math.round(calorieGoal!)}
          </Text>
        ) : null}
      </Text>
      <Text className="mt-1 text-sm text-[#888888]">kcal</Text>
    </View>
  );

  return (
    <View className="items-center">
      <View className="mb-1 items-center">
        <Text className="text-[10px] uppercase tracking-wide text-[#888888]">
          Carbs
        </Text>
        <Text className="text-sm font-semibold text-white">{Math.round(carbsG)}g</Text>
      </View>

      <View className="flex-row items-center justify-center">
        <View className="w-[56px] items-center pr-1">
          <Text className="text-[10px] uppercase tracking-wide text-[#888888]">
            Protein
          </Text>
          <Text className="text-sm font-semibold text-white">{Math.round(proteinG)}g</Text>
        </View>

        <MacroRing
          value={hasGoal ? caloriesConsumed : 0}
          max={max}
          color={BRAND}
          label=""
          size={200}
          strokeWidth={14}
          centerContent={center}
        />

        <View className="w-[56px] items-center pl-1">
          <Text className="text-[10px] uppercase tracking-wide text-[#888888]">Fat</Text>
          <Text className="text-sm font-semibold text-white">{Math.round(fatG)}g</Text>
        </View>
      </View>
    </View>
  );
}
