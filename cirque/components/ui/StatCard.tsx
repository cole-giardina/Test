import { Text, View } from "react-native";

type StatCardProps = {
  label: string;
  value: number;
  unit: string;
  /** 0–100 for bar width */
  barPercent: number;
  barColor: string;
};

export function StatCard({
  label,
  value,
  unit,
  barPercent,
  barColor,
}: StatCardProps) {
  const widthPct = Math.min(100, Math.max(0, barPercent));
  return (
    <View
      className="flex-1 overflow-hidden rounded-xl bg-[#1a1a1a] px-4 py-3"
      style={{ borderRadius: 12 }}
    >
      <Text
        className="text-[11px] uppercase tracking-wide text-[#888888]"
        style={{ fontSize: 11 }}
      >
        {label}
      </Text>
      <Text className="mt-1 text-2xl font-bold text-white">
        {Math.round(value)}
        <Text className="text-sm font-normal text-[#888888]"> {unit}</Text>
      </Text>
      <View className="mt-3 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
        <View
          className="h-full rounded-full"
          style={{
            width: `${widthPct}%`,
            backgroundColor: barColor,
          }}
        />
      </View>
    </View>
  );
}
