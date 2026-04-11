import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";

import { colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const { isLoading, session, profileComplete } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-bg">
        <ActivityIndicator size="large" color={colors.accentBright} />
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
