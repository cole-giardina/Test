import type { ReactNode } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { colors } from "@/constants/colors";

type MacroRingProps = {
  value: number;
  max: number;
  color: string;
  label: string;
  size?: number;
  strokeWidth?: number;
  /** Track (unfilled arc) color */
  trackColor?: string;
  /** When set, replaces the default label + value in the center (e.g. calorie hero). */
  centerContent?: ReactNode;
};

/**
 * Circular progress ring: fill arc = min(1, value / max).
 */
export function MacroRing({
  value,
  max,
  color,
  label,
  size = 56,
  strokeWidth = 6,
  trackColor = colors.border,
  centerContent,
}: MacroRingProps) {
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const dash = circumference * pct;

  return (
    <View className="items-center" style={{ width: size }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G transform={`rotate(-90 ${cx} ${cy})`}>
            <Circle
              cx={cx}
              cy={cy}
              r={radius}
              stroke={trackColor}
              opacity={0.85}
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={cx}
              cy={cy}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${dash} ${circumference}`}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        <View
          className="absolute inset-0 items-center justify-center px-1"
          pointerEvents="none"
        >
          {centerContent ?? (
            <>
              <Text
                className="text-[9px] uppercase tracking-wide"
                style={{ color: colors.textTertiary }}
              >
                {label}
              </Text>
              <Text
                className="text-xs font-semibold text-white"
              >
                {Math.round(value)}
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
