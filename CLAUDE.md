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

- **Home tab** is **`app/(tabs)/index.tsx`**: **dark slate** theme (see **Design system** above), dense layout—greeting + date, calorie hero ring, electrolyte **StatCards**, optional macro bars, recent workouts, today’s food preview, AI recommendation card. **Pull-to-refresh** calls **`useDashboard().refresh()`**.
- **`useDashboard`** (**`cirque/hooks/useDashboard.ts`**) aggregates data for the screen. **`profile`** comes from **`useAuth`** (no extra fetch). In parallel (**`Promise.all`**), it loads **`getTodaysFoodLogs`**, **`getDailyTotals(userId, today)`** (local **`YYYY-MM-DD`** via **`getTodayDateString()`** in **`lib/formatters.ts`**), **`getRecentWorkouts`** and **`getLatestAiRecommendation`** from **`lib/dashboardData.ts`**. Each query **`.catch`es** so one failure does not wipe the rest. Waits for **`authLoading`** from **`AuthContext`** before fetching.
- **UI building blocks**: **`CalorieRingHero`** (wraps **`MacroRing`** with **`centerContent`** for kcal + satellites for P/C/F grams), **`StatCard`**, **`MacroBar`**, **`SectionHeader`**, **`WorkoutRow`**, **`RecommendationCard`** under **`components/ui/`**.
- **Electrolyte daily targets** (dashboard bars): **sodium 1500 mg**, **potassium 3500 mg**, **magnesium 400 mg**. Bar fill = **min(100%, consumed ÷ target × 100)**; fill uses per-electrolyte tokens from **`colors`** if at or under target, **warning** (`#E8A838`) if over.
- **Macro goals** (from profile): **protein** = **`profile.daily_protein_g`** (fallback **120 g** in bars); **carbs** = **`(daily_calorie_goal × 0.5) / 4`**; **fat** = **`(daily_calorie_goal × 0.25) / 9`**. The **macro breakdown** block is **hidden** unless **`profile.daily_calorie_goal`** is set (> 0).
- **Calorie ring**: if **no calorie goal**, the ring shows **no progress arc** (max placeholder **1**); center still shows **consumed kcal** only.
- **Helpers** (**`lib/formatters.ts`**): **`formatDuration`**, **`formatDate`** (Today / Yesterday / short weekday), **`getGreeting`**, **`formatFirstName`**, **`getTodayDateString`**.
- **AI recommendation card**: **`RecommendationCard`** shows copy from **`ai_recommendations`** when present; otherwise prompts the user to log a workout for refueling advice. **`ai_recommendations`** rows will populate once the **AI pipeline** and **HealthKit**-driven flows exist; until then the empty state is expected.

---

## Dev build (iOS / EAS)

- **Bundle ID:** **`com.cirque.app`** (`ios.bundleIdentifier` in **`app.json`**).
- **URL scheme:** **`cirque`** (`scheme` in **`app.json`**) for deep links.
- **EAS project ID:** set in **`app.json`** under **`expo.extra.eas.projectId`** after **`eas init`** (link the project once; use the same ID in Expo dashboard).
- **Apple Developer Team ID:** chosen during **first** **`eas build`** when EAS prompts for credentials, or visible in [Apple Developer](https://developer.apple.com) → Membership / Keys; also stored in Expo project credentials after setup.
- **EAS profiles** (**`eas.json`**): **`development`** — dev client, internal distribution, **physical device** (`ios.simulator: false`); **`simulator`** — dev client for **iOS Simulator**; **`preview`** — internal; **`production`** — App Store (`store`).
- **Dev client:** **`expo-dev-client`** is in **`package.json`** and listed in **`app.json`** **`plugins`** (with **`expo-router`**, **`expo-build-properties`**, **`apple-health`**, etc.).
- **HealthKit:** **`ios.infoPlist`** usage strings (**`NSHealthShareUsageDescription`**, **`NSHealthUpdateUsageDescription`**), **`ios.entitlements`** (`healthkit`, `healthkit.background-delivery`), **`deploymentTarget` `16.0`** via **`expo-build-properties`**, and the **`apple-health`** config plugin are declared in **`app.json`**. **`lib/healthkit.ts`** is a **scaffold** only (TODOs)—runtime permission tests use **`apple-health`** (`AppleHealth.requestAuthorization`); do **not** use the npm package **`expo-health`** (placeholder).
- **Deferred native packages (dev client only):** **`apple-health`**, **`expo-camera`**, **`expo-barcode-scanner`**—not available in Expo Go; rebuild the dev client after native changes.
- **EAS CLI:** use **`cd cirque && npx eas …`** (or global **`eas`**).

**Commands (local machine)**

1. **Log in:** `cd cirque && npx eas login` (create an account at [expo.dev](https://expo.dev) if needed).
2. **Link project:** `npx eas init` (accept defaults; updates **`app.json`** with **`projectId`**).
3. **iOS device dev build:** `npx eas build --profile development --platform ios` — allow EAS to generate/manage credentials; pick your Apple team when prompted. Build runs in the cloud (~10–20 minutes). Watch the first minutes for credential or config errors.
4. **Install on iPhone:** open the build page from EAS (QR code or link), install the **.ipa**, then **Settings → General → VPN & Device Management** → trust the developer profile for your Apple ID.
5. **Start Metro for dev client:** `npx expo start --dev-client` (iPhone and Mac on the same Wi‑Fi; open the Cirque dev build and connect to the bundler).

**HealthKit smoke test (temporary UI)**

- Profile tab includes a **“Test HealthKit (temporary)”** button (iOS only) calling **`apple-health`** authorization for workouts, active energy, heart rate, walking/running distance, cycling distance. **Remove** after confirming the system permission sheet and **`AuthorizationResult`** in logs. **HealthKit confirmed working on device:** *pending — set to yes/no after testing.*

---

## Phases

| Phase | Focus |
|-------|--------|
| **Phase 1** | Foundation—auth, profiles, core navigation, **HealthKit** ingestion into `workouts`. |
| **Phase 2** | **Strava** OAuth + sync, **Nutritionix** lookup and barcode flow, food logging UI. |
| **Phase 3** | **AI layer**—Claude for text meals and refueling cards; persist recommendations with `context_snapshot`. |
| **Phase 4** | **Dashboard + polish**—trends, goal progress, App Store readiness, performance and accessibility. |

Short labels: **Phase 1:** foundation + HealthKit · **Phase 2:** Strava + Nutritionix · **Phase 3:** AI layer · **Phase 4:** dashboard + polish.
