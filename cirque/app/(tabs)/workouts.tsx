import { Text, View } from "react-native";

import { FrostedCard } from "@/components/ui/FrostedCard";
import { colors } from "@/constants/colors";

export default function WorkoutsTab() {
  return (
    <View className="flex-1 items-center justify-center bg-brand-bg px-6">
      <FrostedCard>
        <Text className="text-lg font-semibold text-white">Workouts</Text>
        <Text
          className="mt-2 text-center text-sm leading-relaxed"
          style={{ color: colors.textSecondary }}
        >
          Placeholder — sessions from HealthKit and Strava.
        </Text>
      </FrostedCard>
    </View>
  );
}
