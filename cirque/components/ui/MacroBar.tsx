import { Text, View } from "react-native";

type MacroBarProps = {
  label: string;
  value: number;
  max: number;
  color: string;
};

export function MacroBar({ label, value, max, color }: MacroBarProps) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <View className="flex-row items-center gap-3">
      <Text
        className="w-16 text-sm text-white"
        numberOfLines={1}
      >
        {label}
      </Text>
      <View className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <View
          className="h-full rounded-full"
          style={{ width: `${pct * 100}%`, backgroundColor: color }}
        />
      </View>
      <Text className="w-28 text-right text-xs text-[#888888]" numberOfLines={1}>
        {Math.round(value)}g / {Math.round(max)}g
      </Text>
    </View>
  );
}
