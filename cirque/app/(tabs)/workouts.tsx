import { Text, View } from "react-native";

export default function WorkoutsTab() {
  return (
    <View className="flex-1 items-center justify-center bg-zinc-950 px-6">
      <Text className="text-lg font-semibold text-zinc-100">Workouts</Text>
      <Text className="mt-2 text-center text-sm text-zinc-500">
        Placeholder — sessions from HealthKit and Strava.
      </Text>
    </View>
  );
}
