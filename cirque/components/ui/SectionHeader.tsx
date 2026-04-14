import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";

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
    <View className="mb-3 flex-row items-center justify-between">
      <Text
        className="text-[11px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: colors.textTertiary }}
        numberOfLines={1}
      >
        {title.toUpperCase()}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text
            className="text-sm font-semibold"
            style={{ color: colors.accentBright }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
