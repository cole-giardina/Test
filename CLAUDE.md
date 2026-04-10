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

## Food logging

- **Natural-language input** on **`app/(tabs)/log.tsx`**: the user describes what they ate. **`expo-camera`** and **`expo-barcode-scanner`** are installed for the **development build** only—they do **not** work in **Expo Go**; wire them in the dev client when ready.
- **Claude parsing** lives in **`cirque/lib/foodAI.ts`**: **`parseFoodEntry(description: string, mealType: string)`** calls the Anthropic Messages API with model **`claude-sonnet-4-20250514`**, `max_tokens: 500`, a fixed **system** prompt (endurance-focused estimates, JSON-only), and a **user** prompt that asks for a strict JSON shape (description, macros, electrolytes in mg, `confidence`, `notes`). The client parses JSON (including markdown code fences if the model wraps the payload) and returns **`ParsedFoodNutrition`**; failures throw descriptive errors.
- **Environment**: set **`EXPO_PUBLIC_ANTHROPIC_API_KEY`** in **`cirque/.env.local`** (see **`.env.example`**). Restart Expo after changes.
- **Preview-before-save**: after a successful parse, **`NutritionPreviewCard`** shows the estimate with **Save** / **Edit**; **Save** persists via **`saveFoodLog`** in **`cirque/lib/foodLog.ts`**. **Edit** dismisses the preview and restores the original text in the input.
- **Persistence**: **`saveFoodLog(userId, entry)`** uses **`profiles.id`** as `userId` (FK `food_logs.user_id`). Entries use **`source: 'ai'`**. Optional **`confidence`** (`high` | `medium` | `low`) is stored on **`food_logs.confidence`** when the migration adding that column is applied.
- **Reads**: **`getTodaysFoodLogs(userId)`** and **`getDailyTotals(userId, date)`** (`date` = local calendar day **`YYYY-MM-DD`**) support the log UI and totals; listing uses today’s midnight–end in the device timezone.
- **Meal type pills** default from **time of day** (same rules as in the Log screen: before 10 → Breakfast, etc.).
- **Security note**: the API key is bundled in the client today (**`dangerouslyAllowBrowser: true`** on the Anthropic SDK). Plan to move parsing to a **Supabase Edge Function** (or backend) before production so the key is not exposed.

---

## Dashboard

- **Home tab** is **`app/(tabs)/index.tsx`**: dark (**`#0a0a0a`**), teal accents (**`#00D4A0`**), dense layout—greeting + date, calorie hero ring, electrolyte **StatCards**, optional macro bars, recent workouts, today’s food preview, AI recommendation card. **Pull-to-refresh** calls **`useDashboard().refresh()`**.
- **`useDashboard`** (**`cirque/hooks/useDashboard.ts`**) aggregates data for the screen. **`profile`** comes from **`useAuth`** (no extra fetch). In parallel (**`Promise.all`**), it loads **`getTodaysFoodLogs`**, **`getDailyTotals(userId, today)`** (local **`YYYY-MM-DD`** via **`getTodayDateString()`** in **`lib/formatters.ts`**), **`getRecentWorkouts`** and **`getLatestAiRecommendation`** from **`lib/dashboardData.ts`**. Each query **`.catch`es** so one failure does not wipe the rest. Waits for **`authLoading`** from **`AuthContext`** before fetching.
- **UI building blocks**: **`CalorieRingHero`** (wraps **`MacroRing`** with **`centerContent`** for kcal + satellites for P/C/F grams), **`StatCard`**, **`MacroBar`**, **`SectionHeader`**, **`WorkoutRow`**, **`RecommendationCard`** under **`components/ui/`**.
- **Electrolyte daily targets** (dashboard bars): **sodium 1500 mg**, **potassium 3500 mg**, **magnesium 400 mg**. Bar fill = **min(100%, consumed ÷ target × 100)**; color **teal** if at or under target, **amber** (`#F59E0B`) if over.
- **Macro goals** (from profile): **protein** = **`profile.daily_protein_g`** (fallback **120 g** in bars); **carbs** = **`(daily_calorie_goal × 0.5) / 4`**; **fat** = **`(daily_calorie_goal × 0.25) / 9`**. The **macro breakdown** block is **hidden** unless **`profile.daily_calorie_goal`** is set (> 0).
- **Calorie ring**: if **no calorie goal**, the ring shows **no progress arc** (max placeholder **1**); center still shows **consumed kcal** only.
- **Helpers** (**`lib/formatters.ts`**): **`formatDuration`**, **`formatDate`** (Today / Yesterday / short weekday), **`getGreeting`**, **`formatFirstName`**, **`getTodayDateString`**.
- **AI recommendation card**: **`RecommendationCard`** shows copy from **`ai_recommendations`** when present; otherwise prompts the user to log a workout for refueling advice. **`ai_recommendations`** rows will populate once the **AI pipeline** and **HealthKit**-driven flows exist; until then the empty state is expected.

---

## Dev build (iOS / EAS)

- **Bundle ID:** **`com.cirque.app`** (`ios.bundleIdentifier` in **`app.json`**).
- **EAS profiles** (**`eas.json`**): **`development`** — dev client, internal distribution, **physical device** (`ios.simulator: false`); **`simulator`** — dev client for **iOS Simulator**; **`preview`** — internal; **`production`** — App Store (`store`).
- **Apple Developer Program:** a **paid** membership (**$99/year**) is required for device builds, TestFlight, and App Store; EAS uses your Apple account for signing.
- **HealthKit:** **`ios.infoPlist`** usage strings, **`ios.entitlements`** (`healthkit`, `healthkit.background-delivery`), **`deploymentTarget` `16.0`** via **`expo-build-properties`**, and the **`apple-health`** config plugin are declared in **`app.json`**. **`lib/healthkit.ts`** is a **scaffold** only (TODOs)—runtime integration uses the **`apple-health`** package (the npm package named **`expo-health`** is an empty placeholder; do not use it).
- **Deferred native packages (dev client only):** **`apple-health`**, **`expo-camera`**, **`expo-barcode-scanner`**—not available in Expo Go; rebuild the dev client after native changes.
- **EAS CLI:** installed as a **devDependency** (`eas-cli`); use **`cd cirque && npx eas …`** (global `npm i -g eas-cli` is optional if you prefer).
- **Build commands (after `eas login` and Apple account ready):**
  - Device: `cd cirque && eas build --profile development --platform ios`
  - Simulator: `cd cirque && eas build --profile simulator --platform ios`
- **Apple Team ID:** EAS will prompt for it (or read from **`eas.json`** / credentials) when you configure iOS credentials—needed for provisioning profiles and signing; set it during the first **`eas build`** or in the Expo dashboard under project credentials.

---

## Phases

| Phase | Focus |
|-------|--------|
| **Phase 1** | Foundation—auth, profiles, core navigation, **HealthKit** ingestion into `workouts`. |
| **Phase 2** | **Strava** OAuth + sync, **Nutritionix** lookup and barcode flow, food logging UI. |
| **Phase 3** | **AI layer**—Claude for text meals and refueling cards; persist recommendations with `context_snapshot`. |
| **Phase 4** | **Dashboard + polish**—trends, goal progress, App Store readiness, performance and accessibility. |

Short labels: **Phase 1:** foundation + HealthKit · **Phase 2:** Strava + Nutritionix · **Phase 3:** AI layer · **Phase 4:** dashboard + polish.
