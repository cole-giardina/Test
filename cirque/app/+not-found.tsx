import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View className="flex-1 items-center justify-center bg-zinc-950 px-6">
        <Text className="mb-4 text-lg text-zinc-100">
          This screen does not exist.
        </Text>
        <Link href="/">
          <Text className="text-base text-cyan-400">Go home</Text>
        </Link>
      </View>
    </>
  );
}
