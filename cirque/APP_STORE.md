# App Store release checklist (Cirque)

Use this before submitting an iOS build to TestFlight or the App Store.

## Build and configuration

- [ ] **EAS project** linked (`app.config.js` → `extra.eas.projectId`).
- [ ] **Supabase Edge Functions** `parse-food` and `refuel` deployed; **`ANTHROPIC_API_KEY`** set in Supabase project secrets (not in the client).
- [ ] **Production / preview EAS profiles** do not rely on **`EXPO_PUBLIC_ANTHROPIC_API_KEY`** in the client bundle (`EAS_BUILD_PROFILE` strips extra key for `production` and `preview` in `app.config.js`).
- [ ] **`EXPO_PUBLIC_SUPABASE_URL`** and **`EXPO_PUBLIC_SUPABASE_ANON_KEY`** are correct for production.

## App Store Connect

- [ ] **Privacy Nutrition Labels** completed (health/fitness, data linked to user as applicable).
- [ ] **App Privacy** questionnaire matches actual behavior (HealthKit, network, optional third parties such as Strava or Nutritionix).
- [ ] **Review notes** describe login (email), HealthKit usage, and any demo account if required.
- [ ] **Screenshots** for required device sizes (and optional App Preview).
- [ ] **Export compliance**: `ITSAppUsesNonExemptEncryption` is set to `false` in [`app.json`](app.json) for standard HTTPS-only apps; adjust if you add non-exempt encryption.

## Optional (recommended later)

- [ ] **Crash reporting** (e.g. Sentry) with native config and source maps—requires a new dev client build after adding the SDK.
- [ ] **Accessibility**: verify VoiceOver on primary tabs (Dashboard, Log, Workouts, Trends, Profile) and dynamic type on key screens.
