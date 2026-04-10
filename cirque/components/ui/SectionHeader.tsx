import { Pressable, Text, View } from "react-native";

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: SectionHeaderProps) {
  return (
    <View className="mb-2 flex-row items-center justify-between">
      <Text
        className="text-[13px] uppercase tracking-wide text-[#888888]"
        style={{ fontSize: 13 }}
      >
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text className="text-sm font-semibold text-[#00D4A0]">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
