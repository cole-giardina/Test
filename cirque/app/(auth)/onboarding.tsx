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

import { AtmosphericBg } from "@/components/ui/AtmosphericBg";
import { FrostedCard } from "@/components/ui/FrostedCard";
import { colors } from "@/constants/colors";
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

const TOTAL_STEPS = 1;

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
      className="flex-1 bg-brand-bg"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-1">
        <AtmosphericBg />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingVertical: 32,
            paddingBottom: 48,
          }}
        >
          <View className="mb-8">
            <Text
              className="text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: colors.textTertiary }}
            >
              {`Step 1 of ${TOTAL_STEPS}`}
            </Text>
            <View
              className="mt-2 h-1 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: `${colors.border}99` }}
            >
              <View
                className="h-full rounded-full"
                style={{
                  width: "100%",
                  backgroundColor: colors.accentBright,
                }}
              />
            </View>
          </View>

          <Text className="mb-2 text-2xl font-bold text-white">
            Tell us about you
          </Text>
          <Text
            className="mb-8 text-sm leading-relaxed"
            style={{ color: colors.textSecondary }}
          >
            We use this to personalize fueling and recovery guidance.
          </Text>

          <FrostedCard className="mb-5">
            <TextInput
              className="text-base text-white"
              placeholder="Display name"
              placeholderTextColor={colors.textTertiary}
              value={displayName}
              onChangeText={setDisplayName}
            />
          </FrostedCard>

          <Text
            className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: colors.textTertiary }}
          >
            Sport
          </Text>
          <FrostedCard padding={0} className="mb-5">
            <Picker
              selectedValue={sportType}
              onValueChange={(v) => setSportType(v)}
              style={{ color: colors.textPrimary }}
              dropdownIconColor={colors.accentBright}
              itemStyle={{ color: colors.textPrimary }}
            >
              {SPORT_TYPES.map((s) => (
                <Picker.Item
                  key={s}
                  label={s}
                  value={s}
                  color={colors.textPrimary}
                />
              ))}
            </Picker>
          </FrostedCard>

          <Text
            className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: colors.textTertiary }}
          >
            Training level
          </Text>
          <FrostedCard padding={0} className="mb-5">
            <Picker
              selectedValue={trainingLevel}
              onValueChange={(v) => setTrainingLevel(v)}
              style={{ color: colors.accentBright }}
              itemStyle={{ color: colors.textPrimary }}
            >
              {TRAINING_LEVELS.map((s) => (
                <Picker.Item
                  key={s}
                  label={s}
                  value={s}
                  color={colors.textPrimary}
                />
              ))}
            </Picker>
          </FrostedCard>

          <View className="mb-5 flex-row gap-3">
            <View className="flex-1">
              <Text
                className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em]"
                style={{ color: colors.textTertiary }}
              >
                Weight (kg)
              </Text>
              <FrostedCard padding={12}>
                <TextInput
                  className="text-base text-white"
                  placeholder="e.g. 70"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                  value={weightKg}
                  onChangeText={setWeightKg}
                />
              </FrostedCard>
            </View>
            <View className="flex-1">
              <Text
                className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em]"
                style={{ color: colors.textTertiary }}
              >
                Age
              </Text>
              <FrostedCard padding={12}>
                <TextInput
                  className="text-base text-white"
                  placeholder="e.g. 32"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  value={age}
                  onChangeText={setAge}
                />
              </FrostedCard>
            </View>
          </View>

          <Text
            className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: colors.textTertiary }}
          >
            Sex
          </Text>
          <FrostedCard padding={0} className="mb-8">
            <Picker
              selectedValue={sex}
              onValueChange={(v) => setSex(v)}
              style={{ color: colors.textPrimary }}
              itemStyle={{ color: colors.textPrimary }}
            >
              {SEX_OPTIONS.map((s) => (
                <Picker.Item
                  key={s}
                  label={s}
                  value={s}
                  color={colors.textPrimary}
                />
              ))}
            </Picker>
          </FrostedCard>

          {error ? (
            <Text className="mb-4 text-sm" style={{ color: colors.danger }}>
              {error}
            </Text>
          ) : null}

          <Pressable
            className="h-[52px] w-full items-center justify-center rounded-[12px] active:opacity-90"
            style={{
              backgroundColor: colors.accent,
              borderWidth: 1,
              borderColor: colors.accentBright,
            }}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text className="text-center text-base font-bold text-white">
                Continue
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
