import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";

import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const { isLoading, session, profileComplete } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-950">
        <ActivityIndicator size="large" color="#fafafa" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!profileComplete) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
