import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

type FrostedCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  /** Optional 1px top accent (e.g. electrolyte brand colors). */
  accentTop?: string;
  /** Optional thick left accent (e.g. AI recommendation stripe). */
  leftBorderAccent?: string;
  /** Inner padding; default 16. */
  padding?: number;
};

export function FrostedCard({
  children,
  style,
  className,
  accentTop,
  leftBorderAccent,
  padding = 16,
}: FrostedCardProps) {
  return (
    <View
      className={className}
      style={[
        {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "rgba(42, 69, 96, 0.6)",
          backgroundColor: "rgba(26, 46, 64, 0.85)",
          overflow: "hidden",
          ...(leftBorderAccent
            ? { borderLeftWidth: 3, borderLeftColor: leftBorderAccent }
            : null),
        },
        style,
      ]}
    >
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: accentTop ?? "rgba(174, 207, 220, 0.15)",
        }}
        pointerEvents="none"
      />
      <View style={{ padding }}>{children}</View>
    </View>
  );
}
