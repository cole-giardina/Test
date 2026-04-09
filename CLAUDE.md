# Cirque — project context for Claude

**Cirque** is an AI-powered nutrition and recovery assistant for **endurance athletes** (iOS-first React Native + Expo app in `cirque/`).

## Project overview

**Concept:** Align fueling and recovery with training load, sweat loss, and goals.

**Target user:** Runners, cyclists, triathletes, and similar athletes who log workouts, care about macros and electrolytes, and want guidance tied to real sessions—not generic advice.

**Tech stack:** **React Native** with **Expo** (**iOS-first**), **Supabase** (Postgres, auth, storage, RLS), and **Claude API** for natural-language food understanding and post-workout refueling recommendations.

---

## Architecture decisions

- **React Native + Expo:** Fast iteration on iOS, OTA updates via Expo, shared TypeScript types with Supabase, and a path to native modules (HealthKit, etc.) via config plugins and dev clients when needed.
- **Hybrid food logging (Nutritionix + Claude API):** Structured nutrition data from **Nutritionix** where lookups succeed; **Claude** interprets free-text meals, corrects ambiguities, and normalizes into the same logging model so the UX stays conversational without sacrificing macro quality.
- **Strava + HealthKit:** **HealthKit** is the on-device source of truth for sessions and physiology on iPhone; **Strava** adds social/history and duplicate detection for outdoor work. Together they reduce manual entry while keeping `workouts` as a unified fact table in Supabase.

---

## Auth architecture

- **Auth methods (current):** Email + password (`signInWithPassword`, `signUp`) and **magic link** (`signInWithOtp`). Helpers live in `cirque/lib/auth.ts` with basic validation before calling Supabase.
- **Deferred:** Apple Sign-In and Google Sign-In—add in a later phase (native OAuth + Supabase provider config).
- **Profile creation flow:** After sign-in, `AuthContext` loads `profiles` by `auth_user_id`. The DB trigger still inserts a minimal `profiles` row on signup; onboarding **updates** that row with `sport_type`, `training_level`, and other fields. **`profileComplete`** is true when `sport_type` and `training_level` are set—then the user is routed to `(tabs)`; otherwise they see `(auth)/onboarding`.
- **Session storage:** Supabase session JSON is stored with the **LargeSecureStore** pattern from Supabase’s Expo guide: an AES key in **expo-secure-store** and encrypted payload in **AsyncStorage** (avoids SecureStore size limits on large JWTs).
- **AuthContext** exposes: `session`, `user`, `profile`, `isLoading`, `profileComplete`, `signOut()`, `refreshProfile()`. **`useAuth()`** reads this context and **throws** if used outside `<AuthProvider>` (root layout wraps the app).
- **Routing:** Root `app/_layout.tsx` uses Expo Router `Stack` plus effects to keep unauthenticated users in `(auth)` and authenticated users with a complete profile in `(tabs)`.

---

## Database schema summary

One line per table:

| Table | Purpose |
|-------|---------|
| `profiles` | App profile linked to Supabase Auth (`auth.users`)—demographics, sport, nutrition prefs, restrictions. |
| `workouts` | Training sessions from HealthKit, Strava, or manual entry—duration, distance, HR, fuel-loss hints, raw payloads. |
| `food_logs` | Meals and snacks—macros, electrolytes, optional link to a workout, source (Nutritionix / AI / manual). |
| `ai_recommendations` | Stored AI outputs with trigger type and a `context_snapshot` for audit and improvement. |
| `goals` | User-defined numeric targets (e.g. protein, weight, race) with units and optional end dates. |

---

## Key conventions

- **TypeScript strict mode** in the app—no implicit `any`, explicit null handling at API boundaries.
- **All database access** goes through the **Supabase client** (no raw SQL from the client except via RPC if added later).
- **Row Level Security (RLS)** is **enabled on every table**; users may only read and write their own rows (policies tie `auth.uid()` to `profiles.auth_user_id` or to rows owned via `profiles.id`).

---

## AI layer notes

- **Claude API** is used for **food interpretation** (natural language → structured logs) and **post-workout refueling recommendations** (recent workouts, sweat/electrolyte signals when available, goals and restrictions).
- **`context_snapshot` (JSONB)** on `ai_recommendations` stores **what the model knew at recommendation time** (e.g. workout summary, partial food log, goal snapshot)—for debugging, regression testing when prompts change, and future “why did it say that?” UX without trusting mutable rows alone.

---

## Phases

| Phase | Focus |
|-------|--------|
| **Phase 1** | Foundation—auth, profiles, core navigation, **HealthKit** ingestion into `workouts`. |
| **Phase 2** | **Strava** OAuth + sync, **Nutritionix** lookup and barcode flow, food logging UI. |
| **Phase 3** | **AI layer**—Claude for text meals and refueling cards; persist recommendations with `context_snapshot`. |
| **Phase 4** | **Dashboard + polish**—trends, goal progress, App Store readiness, performance and accessibility. |

Short labels: **Phase 1:** foundation + HealthKit · **Phase 2:** Strava + Nutritionix · **Phase 3:** AI layer · **Phase 4:** dashboard + polish.
