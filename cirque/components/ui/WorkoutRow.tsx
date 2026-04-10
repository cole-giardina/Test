import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { formatDate, formatDuration } from "@/lib/formatters";
import type { Workout } from "@/types/database";

type WorkoutRowProps = {
  workout: Workout;
};

function activityLabel(w: Workout): string {
  const raw = w.activity_type?.trim();
  if (raw) {
    return raw;
  }
  return "Workout";
}

export function WorkoutRow({ workout }: WorkoutRowProps) {
  const when = workout.started_at ?? workout.created_at;
  const durationSec = workout.duration_seconds ?? 0;
  const cal = workout.calories_burned;

  return (
    <View className="flex-row items-center justify-between border-b border-zinc-800/80 py-3 last:border-b-0">
      <View className="flex-1 pr-2">
        <Text className="text-base font-semibold text-white">
          {activityLabel(workout)}
        </Text>
        <Text className="mt-0.5 text-sm text-[#888888]">
          {formatDuration(durationSec)}
          {cal != null && Number.isFinite(Number(cal))
            ? ` · ${Math.round(Number(cal))} kcal burned`
            : ""}
        </Text>
      </View>
      <View className="flex-row items-center gap-1">
        <Text className="text-sm text-[#888888]">
          {when ? formatDate(when) : ""}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#666" />
      </View>
    </View>
  );
}
