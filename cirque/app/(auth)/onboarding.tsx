import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Picker } from "@react-native-picker/picker";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

const SPORT_TYPES = [
  "Running",
  "Cycling",
  "Triathlon",
  "Swimming",
  "Trail Running",
  "Other",
] as const;

const TRAINING_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Elite",
] as const;

const SEX_OPTIONS = ["Male", "Female", "Prefer not to say"] as const;

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [sportType, setSportType] = useState<string>(SPORT_TYPES[0]);
  const [trainingLevel, setTrainingLevel] = useState<string>(
    TRAINING_LEVELS[0],
  );
  const [weightKg, setWeightKg] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<string>(SEX_OPTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!user?.id) {
      setError("Not signed in.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const w = weightKg.trim() ? Number(weightKg) : null;
      const a = age.trim() ? parseInt(age, 10) : null;

      const { error: upsertError } = await supabase.from("profiles").upsert(
        {
          auth_user_id: user.id,
          display_name: displayName.trim() || null,
          sport_type: sportType,
          training_level: trainingLevel,
          weight_kg: w !== null && !Number.isNaN(w) ? w : null,
          age: a !== null && !Number.isNaN(a) ? a : null,
          sex,
        },
        { onConflict: "auth_user_id" },
      );

      if (upsertError) {
        setError(upsertError.message);
        return;
      }

      await refreshProfile();
      router.replace("/(tabs)");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-zinc-950"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 40 }}
      >
        <Text className="mb-2 text-2xl font-bold text-zinc-50">
          Welcome to Cirque
        </Text>
        <Text className="mb-8 text-sm text-zinc-500">
          Tell us a bit about you so we can personalize fueling and recovery.
        </Text>

        <Text className="mb-1 text-xs font-medium uppercase text-zinc-400">
          Display name
        </Text>
        <TextInput
          className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100"
          placeholder="Your name"
          placeholderTextColor="#71717a"
          value={displayName}
          onChangeText={setDisplayName}
        />

        <Text className="mb-1 text-xs font-medium uppercase text-zinc-400">
          Sport
        </Text>
        <View className="mb-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <Picker
            selectedValue={sportType}
            onValueChange={(v) => setSportType(v)}
            style={{ color: "#fafafa" }}
            dropdownIconColor="#a1a1aa"
          >
            {SPORT_TYPES.map((s) => (
              <Picker.Item key={s} label={s} value={s} color="#fafafa" />
            ))}
          </Picker>
        </View>

        <Text className="mb-1 text-xs font-medium uppercase text-zinc-400">
          Training level
        </Text>
        <View className="mb-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <Picker
            selectedValue={trainingLevel}
            onValueChange={(v) => setTrainingLevel(v)}
            style={{ color: "#fafafa" }}
          >
            {TRAINING_LEVELS.map((s) => (
              <Picker.Item key={s} label={s} value={s} color="#fafafa" />
            ))}
          </Picker>
        </View>

        <Text className="mb-1 text-xs font-medium uppercase text-zinc-400">
          Weight (kg)
        </Text>
        <TextInput
          className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100"
          placeholder="e.g. 70"
          placeholderTextColor="#71717a"
          keyboardType="decimal-pad"
          value={weightKg}
          onChangeText={setWeightKg}
        />

        <Text className="mb-1 text-xs font-medium uppercase text-zinc-400">
          Age
        </Text>
        <TextInput
          className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100"
          placeholder="e.g. 32"
          placeholderTextColor="#71717a"
          keyboardType="number-pad"
          value={age}
          onChangeText={setAge}
        />

        <Text className="mb-1 text-xs font-medium uppercase text-zinc-400">
          Sex
        </Text>
        <View className="mb-8 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <Picker
            selectedValue={sex}
            onValueChange={(v) => setSex(v)}
            style={{ color: "#fafafa" }}
          >
            {SEX_OPTIONS.map((s) => (
              <Picker.Item key={s} label={s} value={s} color="#fafafa" />
            ))}
          </Picker>
        </View>

        {error ? (
          <Text className="mb-4 rounded-lg bg-red-950/80 px-3 py-2 text-sm text-red-200">
            {error}
          </Text>
        ) : null}

        <Pressable
          className="rounded-xl bg-cyan-500 py-4 active:opacity-90"
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#09090b" />
          ) : (
            <Text className="text-center text-base font-semibold text-zinc-950">
              Continue
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
