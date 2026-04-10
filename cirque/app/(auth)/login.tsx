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
  /** Set when signUp succeeds but Supabase has not issued a session (e.g. email confirmation required). */
  const [signUpAwaitingEmail, setSignUpAwaitingEmail] = useState(false);

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

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-zinc-950"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingVertical: 48,
        }}
      >
        <Text className="mb-2 text-center text-4xl font-bold tracking-tight text-zinc-50">
          Cirque
        </Text>
        <Text className="mb-10 text-center text-sm text-zinc-500">
          Nutrition & recovery for endurance athletes
        </Text>

        <Text className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
          Email
        </Text>
        <TextInput
          className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base text-zinc-100"
          placeholder="you@example.com"
          placeholderTextColor="#71717a"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
          Password
        </Text>
        <TextInput
          className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base text-zinc-100"
          placeholder="••••••••"
          placeholderTextColor="#71717a"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? (
          <Text className="mb-4 rounded-lg bg-red-950/80 px-3 py-2 text-sm text-red-200">
            {error}
          </Text>
        ) : null}

        <Pressable
          className="mb-3 rounded-xl bg-cyan-500 py-4 active:opacity-90"
          onPress={handleEmailPassword}
          disabled={loadingSignIn}
        >
          {loadingSignIn ? (
            <ActivityIndicator color="#09090b" />
          ) : (
            <Text className="text-center text-base font-semibold text-zinc-950">
              {isSignUpMode ? "Create account" : "Sign in"}
            </Text>
          )}
        </Pressable>

        <Pressable
          className="mb-8 rounded-xl border border-zinc-700 py-4 active:opacity-90"
          onPress={() => {
            setIsSignUpMode(!isSignUpMode);
            setError(null);
            setSignUpAwaitingEmail(false);
          }}
          disabled={loadingSignIn}
        >
          <Text className="text-center text-base font-medium text-zinc-300">
            {isSignUpMode
              ? "Have an account? Sign in"
              : "Create account"}
          </Text>
        </Pressable>

        <View className="mb-6 flex-row items-center gap-3">
          <View className="h-px flex-1 bg-zinc-800" />
          <Text className="text-xs uppercase text-zinc-500">or</Text>
          <View className="h-px flex-1 bg-zinc-800" />
        </View>

        <Pressable
          className="rounded-xl border border-zinc-700 bg-zinc-900 py-4 active:opacity-90"
          onPress={handleMagicLink}
          disabled={loadingMagic}
        >
          {loadingMagic ? (
            <ActivityIndicator color="#fafafa" />
          ) : (
            <Text className="text-center text-base font-medium text-zinc-100">
              Send magic link
            </Text>
          )}
        </Pressable>

        {signUpAwaitingEmail ? (
          <Text className="mt-4 text-center text-sm text-cyan-400">
            Account created. Check your email to confirm your address, then sign in
            here to continue to onboarding.
          </Text>
        ) : null}

        {magicSent ? (
          <Text className="mt-4 text-center text-sm text-cyan-400">
            Check your email for the login link.
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
