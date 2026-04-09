import { supabase } from "@/lib/supabase";

function validateEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return "Email is required.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Enter a valid email address.";
  }
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) {
    return "Password is required.";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  return null;
}

export async function signInWithPassword(email: string, password: string) {
  const emailErr = validateEmail(email);
  if (emailErr) {
    return { error: new Error(emailErr) };
  }
  const pwErr = validatePassword(password);
  if (pwErr) {
    return { error: new Error(pwErr) };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  return { data, error };
}

export async function signUp(email: string, password: string) {
  const emailErr = validateEmail(email);
  if (emailErr) {
    return { error: new Error(emailErr) };
  }
  const pwErr = validatePassword(password);
  if (pwErr) {
    return { error: new Error(pwErr) };
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });
  return { data, error };
}

export async function signInWithOtp(email: string) {
  const emailErr = validateEmail(email);
  if (emailErr) {
    return { error: new Error(emailErr), success: false as const };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
  });

  if (error) {
    return { error, success: false as const };
  }

  return { error: null, success: true as const };
}
