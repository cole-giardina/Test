import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { colors } from "@/constants/colors";

/**
 * Subtle mountain peak lines for auth screens — matches Cirque logo mark geometry.
 */
export function AtmosphericBg() {
  return (
    <View
      pointerEvents="none"
      className="absolute items-center justify-center"
      style={{
        top: "18%",
        left: 0,
        right: 0,
        alignItems: "center",
      }}
    >
      <Svg width={300} height={120} viewBox="0 0 300 120">
        <Path
          d="M 0 95 L 55 45 L 95 75 L 150 25 L 205 70 L 245 40 L 300 88 L 300 120 L 0 120 Z"
          fill="none"
          stroke={colors.accentGlow}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.06}
        />
        <Path
          d="M 20 100 L 75 55 L 120 82 L 175 38 L 230 78 L 275 52 L 300 75"
          fill="none"
          stroke={colors.accentGlow}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.06}
        />
      </Svg>
    </View>
  );
}
