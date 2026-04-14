import { Stack } from "expo-router";

import { colors } from "@/constants/colors";

export default function WorkoutsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0D1B2A" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="manual"
        options={{
          headerShown: true,
          title: "Manual workout",
          headerStyle: { backgroundColor: "#0D1B2A" },
          headerTintColor: colors.accentBright,
          headerTitleStyle: { color: colors.textPrimary },
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: true,
          title: "Workout",
          headerStyle: { backgroundColor: "#0D1B2A" },
          headerTintColor: colors.accentBright,
          headerTitleStyle: { color: colors.textPrimary },
        }}
      />
    </Stack>
  );
}
