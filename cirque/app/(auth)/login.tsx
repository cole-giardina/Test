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

import { AtmosphericBg } from "@/components/ui/AtmosphericBg";
import { FrostedCard } from "@/components/ui/FrostedCard";
import { colors } from "@/constants/colors";
import {
  formatAuthErrorMessage,
  signInWithOtp,
  signInWithPassword,
  signUp,
} from "@/lib/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [loadingSignIn, setLoadingSignIn] = useState(false);
  const [loadingMagic, setLoadingMagic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const [signUpAwaitingEmail, setSignUpAwaitingEmail] = useState(false);
  const [focusEmail, setFocusEmail] = useState(false);
  const [focusPassword, setFocusPassword] = useState(false);

  async function handleEmailPassword() {
    setError(null);
    setSignUpAwaitingEmail(false);
    setLoadingSignIn(true);
    try {
      const fn = isSignUpMode ? signUp : signInWithPassword;
      const result = await fn(email, password);
      if (result.error) {
        setError(formatAuthErrorMessage(result.error));
        return;
      }
      if (isSignUpMode) {
        const session = result.data?.session;
        if (!session) {
          setSignUpAwaitingEmail(true);
        }
      }
    } finally {
      setLoadingSignIn(false);
    }
  }

  async function handleMagicLink() {
    setError(null);
    setMagicSent(false);
    setLoadingMagic(true);
    try {
      const { error: err, success } = await signInWithOtp(email);
      if (err) {
        setError(formatAuthErrorMessage(err));
        return;
      }
      if (success) {
        setMagicSent(true);
      }
    } finally {
      setLoadingMagic(false);
    }
  }

  const defaultBorder = "rgba(42, 69, 96, 0.6)";

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
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 48,
          }}
        >
          <View className="relative mb-10 items-center">
            <Text
              className="text-center font-bold text-white"
              style={{
                fontSize: 40,
                letterSpacing: 12,
                lineHeight: 48,
              }}
            >
              CIRQUE
            </Text>
            <Text
              className="mt-4 text-center text-[11px] font-medium uppercase tracking-[0.25em]"
              style={{ color: colors.textTertiary }}
            >
              {`Fuel · Recover · Perform`}
            </Text>
          </View>

          <FrostedCard
            padding={0}
            style={{
              borderColor: focusEmail ? colors.accent : defaultBorder,
            }}
          >
            <TextInput
              className="px-4 py-4 text-base text-white"
              placeholder="Email"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocusEmail(true)}
              onBlur={() => setFocusEmail(false)}
            />
          </FrostedCard>

          <View className="h-3" />

          <FrostedCard
            padding={0}
            style={{
              borderColor: focusPassword ? colors.accent : defaultBorder,
            }}
          >
            <TextInput
              className="px-4 py-4 text-base text-white"
              placeholder="Password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocusPassword(true)}
              onBlur={() => setFocusPassword(false)}
            />
          </FrostedCard>

          {error ? (
            <Text
              className="mb-4 mt-2 text-sm"
              style={{ color: colors.danger }}
            >
              {error}
            </Text>
          ) : (
            <View className="h-2" />
          )}

          <Pressable
            className="mb-3 h-[52px] w-full items-center justify-center rounded-[12px] active:opacity-90"
            style={{
              backgroundColor: colors.accent,
              borderWidth: 1,
              borderColor: colors.accentBright,
            }}
            onPress={handleEmailPassword}
            disabled={loadingSignIn}
          >
            {loadingSignIn ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text className="text-center text-base font-bold text-white">
                {isSignUpMode ? "Create account" : "Sign in"}
              </Text>
            )}
          </Pressable>

          <Pressable
            className="mb-8 py-3 active:opacity-90"
            onPress={() => {
              setIsSignUpMode(!isSignUpMode);
              setError(null);
              setSignUpAwaitingEmail(false);
            }}
            disabled={loadingSignIn}
          >
            <Text
              className="text-center text-sm font-medium"
              style={{ color: colors.textSecondary }}
            >
              {isSignUpMode
                ? "Have an account? Sign in"
                : "Create account"}
            </Text>
          </Pressable>

          <View className="mb-6 flex-row items-center gap-3">
            <View
              className="h-px flex-1"
              style={{ backgroundColor: `${colors.border}99` }}
            />
            <Text
              className="text-xs uppercase tracking-wide"
              style={{ color: colors.textTertiary }}
            >
              or
            </Text>
            <View
              className="h-px flex-1"
              style={{ backgroundColor: `${colors.border}99` }}
            />
          </View>

          <Pressable
            className="mb-2 h-[52px] w-full items-center justify-center rounded-[12px] border bg-transparent active:opacity-90"
            style={{ borderColor: colors.border }}
            onPress={handleMagicLink}
            disabled={loadingMagic}
          >
            {loadingMagic ? (
              <ActivityIndicator color={colors.accentBright} />
            ) : (
              <Text className="text-center text-base font-semibold text-white">
                Magic link
              </Text>
            )}
          </Pressable>

          {signUpAwaitingEmail ? (
            <Text
              className="mt-4 text-center text-sm"
              style={{ color: colors.textSecondary }}
            >
              Account created. Check your email to confirm your address, then sign in
              here to continue to onboarding.
            </Text>
          ) : null}

          {magicSent ? (
            <Text
              className="mt-4 text-center text-sm"
              style={{ color: colors.textSecondary }}
            >
              Check your email for the login link.
            </Text>
          ) : null}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
