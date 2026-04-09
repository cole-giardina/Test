import { Pressable, Text, View } from "react-native";

import { useAuth } from "@/hooks/useAuth";

export default function ProfileTab() {
  const { profile, signOut } = useAuth();

  return (
    <View className="flex-1 bg-zinc-950 px-6 pt-16">
      <Text className="text-2xl font-bold text-zinc-100">Profile</Text>
      {profile?.display_name ? (
        <Text className="mt-2 text-zinc-400">{profile.display_name}</Text>
      ) : null}
      <Text className="mt-8 text-center text-sm text-zinc-500">
        Placeholder — goals, weight, and account settings.
      </Text>
      <Pressable
        className="mt-auto mb-12 rounded-xl border border-zinc-700 py-4"
        onPress={() => void signOut()}
      >
        <Text className="text-center text-base font-medium text-zinc-300">
          Sign out
        </Text>
      </Pressable>
    </View>
  );
}
