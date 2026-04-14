import { ActivityIndicator, View } from "react-native";

import { colors } from "@/constants/colors";

/**
 * Entry route `/` — auth redirects run in `app/_layout.tsx` (`RootNavigation`) so this
 * screen stays outside `useAuth` (avoids provider ordering issues with Expo Router).
 */
export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-brand-bg">
      <ActivityIndicator size="large" color={colors.accentBright} />
    </View>
  );
}
