import { Text, View } from "react-native";

import { FrostedCard } from "@/components/ui/FrostedCard";
import { colors } from "@/constants/colors";

type StatCardProps = {
  label: string;
  value: number;
  unit: string;
  /** 0–100 for bar width */
  barPercent: number;
  barColor: string;
  /** Top accent line — electrolyte brand color */
  accentTop: string;
};

export function StatCard({
  label,
  value,
  unit,
  barPercent,
  barColor,
  accentTop,
}: StatCardProps) {
  const widthPct = Math.min(100, Math.max(0, barPercent));
  return (
    <View className="min-w-0 flex-1">
      <FrostedCard padding={14} accentTop={accentTop}>
        <Text
          className="text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: colors.textTertiary }}
        >
          {label}
        </Text>
        <Text className="mt-1 text-xl font-bold text-white">
          {Math.round(value)}
          <Text
            className="text-xs font-normal"
            style={{ color: colors.textSecondary }}
          >
            {" "}
            {unit}
          </Text>
        </Text>
        <View
          className="mt-3 h-[3px] w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "rgba(42, 69, 96, 0.5)" }}
        >
          <View
            className="h-full rounded-full"
            style={{
              width: `${widthPct}%`,
              backgroundColor: barColor,
            }}
          />
        </View>
      </FrostedCard>
    </View>
  );
}
