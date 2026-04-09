import "../global.css";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";

import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";

function RootNavigation() {
  const { isLoading, session, profileComplete } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!session) {
      if (segments[0] === "(tabs)") {
        router.replace("/(auth)/login");
      }
      return;
    }

    if (!profileComplete) {
      const onOnboarding =
        segments[0] === "(auth)" && segments.includes("onboarding");
      if (!onOnboarding) {
        router.replace("/(auth)/onboarding");
      }
      return;
    }

    if (segments[0] === "(auth)") {
      router.replace("/(tabs)");
    }
  }, [isLoading, session, profileComplete, segments, router]);

  return (
    <View className="flex-1 bg-zinc-950">
      {isLoading ? (
        <View className="absolute inset-0 z-50 items-center justify-center bg-zinc-950">
          <ActivityIndicator size="large" color="#fafafa" />
        </View>
      ) : null}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}
