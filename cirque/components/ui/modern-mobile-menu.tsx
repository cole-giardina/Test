import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/constants/colors";

type TabIconName = keyof typeof Ionicons.glyphMap;

const ICON_BY_ROUTE: Record<string, TabIconName> = {
  index: "home",
  log: "add-circle",
  workouts: "fitness",
  profile: "person",
};

function titleFromRoute(routeName: string): string {
  switch (routeName) {
    case "index":
      return "Home";
    case "log":
      return "Log";
    case "workouts":
      return "Workouts";
    case "profile":
      return "Profile";
    default:
      return routeName;
  }
}

export function ModernMobileMenu({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bounce = useRef(state.routes.map(() => new Animated.Value(0))).current;
  const focusAnim = useRef<Animated.Value[]>([]);
  const [labelWidths, setLabelWidths] = useState<number[]>(
    state.routes.map(() => 34),
  );

  if (focusAnim.current.length !== state.routes.length) {
    focusAnim.current = state.routes.map((_, i) =>
      new Animated.Value(i === state.index ? 1 : 0),
    );
  }

  useEffect(() => {
    const active = state.index;
    const v = bounce[active];
    if (!v) {
      return;
    }
    v.setValue(0);
    Animated.sequence([
      Animated.timing(v, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(v, {
        toValue: 0,
        duration: 240,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [state.index, bounce]);

  useEffect(() => {
    const animations = focusAnim.current.map((v, i) =>
      Animated.timing(v, {
        toValue: i === state.index ? 1 : 0,
        duration: 340,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    );
    Animated.parallel(animations).start();
  }, [state.index]);

  const barStyle: ViewStyle = {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: Math.max(8, insets.bottom),
    flexDirection: "row",
    gap: 8,
  };

  return (
    <View style={barStyle}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const descriptor = descriptors[route.key];
        const label =
          typeof descriptor.options.tabBarLabel === "string"
            ? descriptor.options.tabBarLabel
            : descriptor.options.title ?? titleFromRoute(route.name);
        const iconName = ICON_BY_ROUTE[route.name] ?? "ellipse";
        const focus = focusAnim.current[index] ?? new Animated.Value(isFocused ? 1 : 0);
        const lineScale = focus;
        const bounceY = bounce[index]?.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        });
        const labelWidth = focus.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 92],
        });
        const labelOpacity = focus.interpolate({
          inputRange: [0, 0.2, 1],
          outputRange: [0, 0.35, 1],
        });
        const labelSlideX = focus.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        });
        const lineSlideX = focus.interpolate({
          inputRange: [0, 1],
          outputRange: [-14, 0],
        });
        const targetLineWidth = Math.max(18, Math.min(86, labelWidths[index] ?? 34));
        const lineWidth = focus.interpolate({
          inputRange: [0, 1],
          outputRange: [0, targetLineWidth],
        });

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            className="rounded-2xl px-2 py-2"
            style={{
              flex: isFocused ? 1.65 : 1,
              backgroundColor: "transparent",
            }}
          >
            <Animated.View
              className="items-center justify-center"
              style={{ transform: [{ translateY: bounceY ?? 0 }] }}
            >
              <View className="flex-row items-center justify-center gap-2">
                <Ionicons
                  name={iconName}
                  size={22}
                  color={isFocused ? colors.accentBright : colors.textTertiary}
                />
                <Animated.View
                  style={{
                    width: labelWidth,
                    opacity: labelOpacity,
                    transform: [{ translateX: labelSlideX }],
                    overflow: "hidden",
                  }}
                >
                  <Text
                    className="text-[12px] font-semibold"
                    style={{ color: colors.textPrimary }}
                    numberOfLines={1}
                    onLayout={(e) => {
                      const measured = Math.ceil(e.nativeEvent.layout.width);
                      if (!measured) {
                        return;
                      }
                      setLabelWidths((prev) => {
                        if (prev[index] === measured) {
                          return prev;
                        }
                        const next = [...prev];
                        next[index] = measured;
                        return next;
                      });
                    }}
                  >
                    {String(label)}
                  </Text>
                </Animated.View>
              </View>
              <Animated.View
                className="mt-1 h-[2px] rounded-full"
                style={{
                  width: lineWidth,
                  opacity: focus,
                  backgroundColor: colors.accentBright,
                  transform: [{ translateX: lineSlideX }],
                }}
              />
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
}

