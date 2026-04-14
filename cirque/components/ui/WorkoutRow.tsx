import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { FrostedCard } from "@/components/ui/FrostedCard";
import { colors } from "@/constants/colors";
import { formatDate, formatDuration } from "@/lib/formatters";
import type { Workout } from "@/types/database";

type WorkoutRowProps = {
  workout: Workout;
  onPress?: () => void;
};

function activityLabel(w: Workout): string {
  const raw = w.activity_type?.trim();
  if (raw) {
    return raw;
  }
  return "Workout";
}

export function WorkoutRow({ workout, onPress }: WorkoutRowProps) {
  const when = workout.started_at ?? workout.created_at;
  const durationSec = workout.duration_seconds ?? 0;
  const cal = workout.calories_burned;
  const calNum =
    cal != null && Number.isFinite(Number(cal)) ? Math.round(Number(cal)) : null;

  const inner = (
    <FrostedCard padding={14}>
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold text-white">
            {activityLabel(workout)}
          </Text>
          <Text
            className="mt-0.5 text-sm"
            style={{ color: colors.textSecondary }}
          >
            {formatDuration(durationSec)}
            {when ? ` · ${formatDate(when)}` : ""}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          {calNum != null ? (
            <Text
              className="text-base font-bold"
              style={{ color: colors.accentBright }}
            >
              {calNum}
            </Text>
          ) : null}
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.textTertiary}
          />
        </View>
      </View>
    </FrostedCard>
  );

  if (onPress) {
    return (
      <View className="mb-3">
        <Pressable onPress={onPress} className="active:opacity-90">
          {inner}
        </Pressable>
      </View>
    );
  }

  return <View className="mb-3">{inner}</View>;
}
