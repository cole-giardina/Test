import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";
import { syncHealthKitWorkouts } from "@/lib/workoutSync";
import type { Profile } from "@/types/database";

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  /** True when sport_type and training_level are set (onboarding finished). */
  profileComplete: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function isProfileComplete(profile: Profile | null): boolean {
  return Boolean(profile?.sport_type && profile?.training_level);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (authUserId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error) {
      console.error("[Auth] fetchProfile error:", error.message);
      setProfile(null);
      return;
    }

    setProfile(data);

    if (Platform.OS === "ios" && data?.id) {
      void syncHealthKitWorkouts(data.id).catch((err) => {
        console.warn("[Auth] HealthKit background sync:", err);
      });
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [fetchProfile, user?.id]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();
      if (cancelled) {
        return;
      }
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        await fetchProfile(initialSession.user.id);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      void (async () => {
        if (nextSession?.user) {
          await fetchProfile(nextSession.user.id);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const profileComplete = isProfileComplete(profile);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      isLoading,
      profileComplete,
      signOut,
      refreshProfile,
    }),
    [
      session,
      user,
      profile,
      isLoading,
      profileComplete,
      signOut,
      refreshProfile,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
