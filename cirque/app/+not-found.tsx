import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

import { colors } from "@/constants/colors";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View className="flex-1 items-center justify-center bg-brand-bg px-6">
        <Text className="mb-4 text-lg text-white">
          This screen does not exist.
        </Text>
        <Link href="/">
          <Text
            className="text-base font-semibold"
            style={{ color: colors.accentBright }}
          >
            Go home
          </Text>
        </Link>
      </View>
    </>
  );
}
