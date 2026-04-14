import type { ReactNode } from "react";
import {
  View,
  type StyleProp,
  type ViewStyle,
  type AccessibilityProps,
} from "react-native";

import { colors } from "@/constants/colors";

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
} & Pick<AccessibilityProps, "accessibilityLabel" | "accessibilityRole">;

export function FrostedCard({
  children,
  style,
  className,
  accentTop,
  leftBorderAccent,
  padding = 16,
  accessibilityLabel,
  accessibilityRole,
}: FrostedCardProps) {
  return (
    <View
      className={className}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      style={[
        {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.11)",
          backgroundColor: colors.background,
          overflow: "hidden",
          // Embossed monochrome: minimal lift + directional edges.
          shadowColor: "#000000",
          shadowOpacity: 0.18,
          shadowRadius: 7,
          shadowOffset: { width: 0, height: 3 },
          elevation: 3,
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
          backgroundColor: accentTop ?? "rgba(255, 255, 255, 0.30)",
        }}
        pointerEvents="none"
      />
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: 1,
          backgroundColor: "rgba(255, 255, 255, 0.20)",
        }}
        pointerEvents="none"
      />
      <View
        style={{
          position: "absolute",
          top: 1,
          left: 1,
          right: 1,
          bottom: 1,
          borderRadius: 15,
          borderWidth: 1,
          borderColor: "rgba(0, 0, 0, 0.08)",
        }}
        pointerEvents="none"
      />
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: "rgba(0, 0, 0, 0.38)",
        }}
        pointerEvents="none"
      />
      <View
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: 1,
          backgroundColor: "rgba(0, 0, 0, 0.30)",
        }}
        pointerEvents="none"
      />
      <View style={{ padding }}>{children}</View>
    </View>
  );
}
