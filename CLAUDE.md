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
- **Strava + HealthKit:** **HealthKit** is the on-device source of truth for sessions and physiology on iPhone; **Strava** OAuth (Profile tab) syncs activities into the same **`workouts`** table via Supabase Edge Functions. Together they reduce manual entry while keeping `workouts` as a unified fact table.

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

## Design system

- **Color tokens:** `cirque/constants/colors.ts` (source of truth) and **`cirque/tailwind.config.js`** (`brand.*` plus legacy **`cirque.*`** aliases for NativeWind classes such as `bg-brand-bg`, `text-cirque-ink`).
- **`FrostedCard`** (`components/ui/FrostedCard.tsx`): base card primitive—semi-transparent slate surface, subtle border, optional top or left accent; **use for grouped content and list rows** instead of flat opaque `View`s.
- **Background:** **`#0D1B2A`** deep slate-blue (not pure black). Secondary: `#112230`.
- **Typography:** uppercase, letter-spaced labels; **bold white** for primary values and headings; secondary copy in cool blue-gray (`#A8C0D0`), tertiary/muted in `#5C7E8F`.
- **Brand personality:** premium athletic tool—cool-toned, data-forward, high legibility (Whoop / high-end GPS aesthetic).
- **`AtmosphericBg`** (`components/ui/AtmosphericBg.tsx`): low-opacity mountain peak lines for **auth** screens; pairs with the Cirque wordmark.
- **Logo reference:** mountain / peak line with a **summit glow** (`accentGlow` `#AECFDC`); accents are cool slate-blue (`#5C7E8F`–`#7FB3C8`), not warm teal.
- **Root shell:** `app/_layout.tsx` uses **`StatusBar`** **`light-content`** on the dark shell.

| Token | Hex | Role |
|-------|-----|------|
| background | `#0D1B2A` | App / tab bar background |
| surface | `#1A2E40` | Frosted cards, inputs |
| border | `#2A4560` | Dividers, ring tracks, tab bar top border |
| textPrimary | `#FFFFFF` | Headings, values |
| textSecondary | `#A8C0D0` | Secondary labels |
| accent / accentBright | `#5C7E8F` / `#7FB3C8` | CTAs, progress, tab active tint |
| accentGlow | `#AECFDC` | Summit highlight, atmospheric art |

---

## AI layer notes

- **Claude** powers **food interpretation** and **post-workout refueling**. **Release builds** call Supabase Edge Functions only (**`parse-food`**, **`refuel`**)—no Anthropic SDK in the bundle for food parsing. **Development** can use **`EXPO_PUBLIC_USE_FOOD_PARSE_EDGE=true`** (same as production) or **`EXPO_PUBLIC_ANTHROPIC_API_KEY`** for direct client parsing.
- **`context_snapshot` (JSONB)** on `ai_recommendations` stores **what the model knew at recommendation time** (e.g. workout summary, partial food log, goal snapshot)—for debugging, regression testing when prompts change, and future “why did it say that?” UX without trusting mutable rows alone.

---

## Food logging

- **Natural-language input** on **`app/(tabs)/log.tsx`**: the user describes what they ate. **`expo-camera`** is available in the **development build** (not Expo Go); barcode scanning can be added later with **`expo-barcode-scanner`** if needed.
- **Claude parsing** lives in **`cirque/lib/foodAI.ts`**: **`parseFoodEntry(description, mealType)`** uses the **`parse-food`** Edge Function in **release** (`!__DEV__`). In **development**, opt into Edge with **`EXPO_PUBLIC_USE_FOOD_PARSE_EDGE=true`**, or the Anthropic Messages API path (model **`claude-sonnet-4-20250514`**, JSON-only) when a dev-only key is set. The client parses JSON (including markdown code fences) into **`ParsedFoodNutrition`**; failures throw descriptive errors.
- **Environment**: see **`cirque/.env.example`**—**`EXPO_PUBLIC_ANTHROPIC_API_KEY`** is for **local dev client parsing only**; production should rely on **`parse-food`** with **`ANTHROPIC_API_KEY`** in Supabase secrets. Restart Expo after env changes.
- **Preview-before-save**: after a successful parse, **`NutritionPreviewCard`** shows the estimate with **Save** / **Edit**; **Save** persists via **`saveFoodLog`** in **`cirque/lib/foodLog.ts`**. **Edit** dismisses the preview and restores the original text in the input.
- **Persistence**: **`saveFoodLog(userId, entry)`** uses **`profiles.id`** as `userId` (FK `food_logs.user_id`). Optional **`workout_id`** links a log to a **`workouts`** row (e.g. deep link from workout detail). Optional **`confidence`** (`high` | `medium` | `low`) on **`food_logs.confidence`**.
- **Reads**: **`getFoodLogsForDate(userId, date)`** and **`getDailyTotals(userId, date)`** (`date` = local **`YYYY-MM-DD`**); **`getTodaysFoodLogs`** is a thin wrapper around **`getFoodLogsForDate(..., getTodayDateString())`**. Log and Dashboard support **browsing other calendar days** (prev/next).
- **Meal type pills** default from **time of day** (same rules as in the Log screen: before 10 → Breakfast, etc.); opening Log with **`workoutId`** (from a workout) defaults meal type to **Post-workout**.
- **Security**: do **not** ship **`EXPO_PUBLIC_ANTHROPIC_API_KEY`** in App Store builds; release food parsing is Edge-only.

---

## Dashboard

- **Home tab** is **`app/(tabs)/index.tsx`**: **dark slate** theme (see **Design system** above), dense layout—greeting + date, **day selector** (local calendar day), calorie hero ring, electrolyte **StatCards**, optional macro bars, recent workouts, food preview for the selected day, AI recommendation card. **Pull-to-refresh** calls **`useDashboard().refresh()`**.
- **`useDashboard`** (**`cirque/hooks/useDashboard.ts`**) aggregates data for the screen. **`profile`** comes from **`useAuth`** (no extra fetch). In parallel (**`Promise.all`**), it loads **`getFoodLogsForDate(userId, dashboardDate)`**, **`getDailyTotals(userId, dashboardDate)`**, **`getWorkouts(userId, 3)`** from **`lib/workoutSync.ts`**, and **`getLatestAiRecommendation`** from **`lib/dashboardData.ts`**. **`setDashboardDate(ymd)`** changes the selected day (defaults to **`getTodayDateString()`**). **`generateRefuel(params?)`** invokes the **`refuel`** Edge Function with optional **`workoutId`**. Each query **`.catch`es** so one failure does not wipe the rest. Waits for **`authLoading`** from **`AuthContext`** before fetching.
- **Macro targets** for Dashboard and Log share **`getMacroTargetsForProfile`** in **`cirque/lib/macroGoals.ts`** (same **50% / 25%** carb/fat split from **`daily_calorie_goal`** as the dashboard macro bars).
- **UI building blocks**: **`CalorieRingHero`** (wraps **`MacroRing`** with **`centerContent`** for kcal + satellites for P/C/F grams), **`StatCard`**, **`MacroBar`**, **`SectionHeader`**, **`WorkoutRow`**, **`RecommendationCard`** under **`components/ui/`**.
- **Electrolyte daily targets** (dashboard bars): **sodium 1500 mg**, **potassium 3500 mg**, **magnesium 400 mg**. Bar fill = **min(100%, consumed ÷ target × 100)**; fill uses per-electrolyte tokens from **`colors`** if at or under target, **warning** (`#E8A838`) if over.
- **Macro goals** (from profile): **protein** = **`profile.daily_protein_g`** (fallback **120 g** in bars); **carbs** = **`(daily_calorie_goal × 0.5) / 4`**; **fat** = **`(daily_calorie_goal × 0.25) / 9`**. The **macro breakdown** block is **hidden** unless **`profile.daily_calorie_goal`** is set (> 0).
- **Calorie ring**: if **no calorie goal**, the ring shows **no progress arc** (max placeholder **1**); center still shows **consumed kcal** only.
- **Helpers** (**`lib/formatters.ts`**): **`formatDuration`**, **`formatDistance`** (meters → `412m` / `12.4km`), **`formatDate`** (Today / Yesterday / short weekday), **`getGreeting`**, **`formatFirstName`**, **`getTodayDateString`**.
- **AI recommendation card**: **`RecommendationCard`** shows copy from **`ai_recommendations`** when present (populated by the **`refuel`** Edge Function); otherwise prompts the user to log a workout for refueling advice.

---

## HealthKit & workout sync

- **`lib/healthkit.ts`:** Uses **`apple-health`** (`HealthKitQuery`, `AppleHealth.requestAuthorization`). Exports **`HealthKitWorkout`**, **`requestHealthKitPermissions`**, **`fetchRecentWorkouts`**, **`fetchWorkoutHeartRate`**, **`fetchTodaysActiveCalories`** (alias **`fetchTodaysCaloriesBurned`**), **`mapActivityType`**. Queries use string identifiers such as **`workout`**, **`heartRate`**, **`activeEnergyBurned`** (not `HK*` C symbols—the package wraps native types).
- **`lib/workoutSync.ts`:** **`syncHealthKitWorkouts(userId)`** pulls up to 50 recent HK workouts, deduplicates, inserts into **`workouts`** with **`source: 'healthkit'`**. **`getWorkouts(userId, limit)`** and **`getWorkoutById(userId, id)`** read from Supabase for UI.
- **Dedup:** Before insert, check for an existing row with **`source = 'healthkit'`** and **`raw_data @> '{"uuid":"<HKSampleUUID>"}'`** (Supabase **`.contains('raw_data', { uuid })`**). Same Apple workout UUID must not insert twice.
- **`hooks/useHealthKit.ts`:** Permission probe via **`getAuthorizationStatus`**, **`requestPermissions`**, **`syncWorkouts`**, **`lastSyncResult`**, **`lastSyncAt`**.
- **`context/AuthContext.tsx`:** After **`profiles`** load on iOS, **`syncHealthKitWorkouts(profile.id)`** runs in the background (errors logged only; never blocks auth).
- **Workouts tab** (**`app/(tabs)/workouts/`** stack): **`index`** lists Supabase workouts (tap row → **`[id]`** detail: log meal for session, refuel for that **`workout_id`**); **+** opens **`manual`** to add a **`source: manual`** workout; pull-to-refresh and header sync; **`Profile`** has Health sync and **Strava** connect when configured.
- **Trends tab** (**`app/(tabs)/trends.tsx`**): rolling **7-day** calorie bars and macro sums via **`getRollingDayTotals`** in **`lib/trends.ts`** (wraps **`getDailyTotals`** per day).
- **Profile tab**: editable display name, calorie/protein goals, dietary restrictions (**`updateProfile`** on **`AuthContext`**); see **[`APP_STORE.md`](cirque/APP_STORE.md)** for release checklist.
- **HealthKit confirmed working on device:** **YES** (permissions validated); full sync requires a **physical device** with data in the Health app.

---

## Dev build (iOS / EAS)

- **Bundle ID:** see **`ios.bundleIdentifier`** in **`app.json`** (e.g. team-specific id).
- **URL scheme:** **`cirque`** (`scheme` in **`app.json`**) for deep links.
- **EAS project ID:** set in **`app.json`** under **`expo.extra.eas.projectId`** after **`eas init`** (link the project once; use the same ID in Expo dashboard).
- **Apple Developer Team ID:** chosen during **first** **`eas build`** when EAS prompts for credentials, or visible in [Apple Developer](https://developer.apple.com) → Membership / Keys; also stored in Expo project credentials after setup.
- **EAS profiles** (**`eas.json`**): **`development`** — dev client, internal distribution, **physical device** (`ios.simulator: false`); **`simulator`** — dev client for **iOS Simulator**; **`preview`** — internal; **`production`** — App Store (`store`).
- **Dev client:** **`expo-dev-client`** is in **`package.json`** and listed in **`app.json`** **`plugins`** (with **`expo-router`**, **`expo-build-properties`**, **`apple-health`**, etc.).
- **HealthKit:** **`ios.infoPlist`** usage strings (**`NSHealthShareUsageDescription`**, **`NSHealthUpdateUsageDescription`**), **`ios.entitlements`** (`healthkit`, `healthkit.background-delivery`), **`deploymentTarget` `16.0`** via **`expo-build-properties`**, and the **`apple-health`** config plugin are declared in **`app.json`**. Runtime access uses **`apple-health`** (see **HealthKit & workout sync** above); do **not** use the npm package **`expo-health`** (placeholder).
- **Deferred native packages (dev client only):** **`apple-health`**, **`expo-camera`**—not available in Expo Go; rebuild the dev client after native changes.
- **EAS CLI:** use **`cd cirque && npx eas …`** (or global **`eas`**). **`app.config.js`** clears **`extra.anthropicApiKey`** for **`production`** and **`preview`** EAS build profiles so the client does not embed a dev Anthropic key.

**Commands (local machine)**

1. **Log in:** `cd cirque && npx eas login` (create an account at [expo.dev](https://expo.dev) if needed).
2. **Link project:** `npx eas init` (accept defaults; updates **`app.json`** with **`projectId`**).
3. **iOS device dev build:** `npx eas build --profile development --platform ios` — allow EAS to generate/manage credentials; pick your Apple team when prompted. Build runs in the cloud (~10–20 minutes). Watch the first minutes for credential or config errors.
4. **Install on iPhone:** open the build page from EAS (QR code or link), install the **.ipa**, then **Settings → General → VPN & Device Management** → trust the developer profile for your Apple ID.
5. **Start Metro for dev client:** `npx expo start --dev-client` (iPhone and Mac on the same Wi‑Fi; open the Cirque dev build and connect to the bundler).

**Before testing sync:** On device, **Settings → Health → Data Access & Devices → Cirque** — enable workout and any metrics you want imported.

---

## Phases

| Phase | Focus |
|-------|--------|
| **Phase 1** | Foundation—auth, profiles, core navigation, **HealthKit** ingestion into `workouts`. |
| **Phase 2** | **Strava** OAuth + sync (in app), **Nutritionix** instant + natural nutrients on Log, food logging UI. **Barcode** still optional / later. |
| **Phase 3** | **AI layer**—Edge **`parse-food`** + **`refuel`**, text meals, recommendations with **`context_snapshot`**. |
| **Phase 4** | **Dashboard + polish**—multi-day food views, **`goals`** table UI, trends, App Store readiness, performance and accessibility. |

Short labels: **Phase 1:** foundation + HealthKit · **Phase 2:** Strava + Nutritionix (shipped except barcode) · **Phase 3:** AI via Edge (shipped) · **Phase 4:** dashboard + polish.
