-- Test (fitness app) — initial schema
--
-- profiles (extends Supabase auth.users)
--   id, auth_user_id (FK auth.users), display_name, sport_type, weight_kg, height_cm, age, sex,
--   daily_calorie_goal, daily_protein_g, training_level, dietary_restrictions (text[]), created_at
--
-- workouts
--   id, user_id (FK profiles), source (healthkit/strava/manual), activity_type, duration_seconds,
--   distance_meters, calories_burned, avg_heart_rate, elevation_gain_m, sweat_rate_ml_hr,
--   raw_data (jsonb), started_at, created_at
--
-- food_logs
--   id, user_id (FK profiles), workout_id (FK workouts, nullable), meal_type, description,
--   source (nutritionix/ai/manual), calories, protein_g, carbs_g, fat_g, sodium_mg, potassium_mg,
--   magnesium_mg, logged_at, created_at
--
-- ai_recommendations
--   id, user_id (FK profiles), workout_id (FK workouts, nullable), trigger_type, recommendation (text),
--   context_snapshot (jsonb), was_helpful (bool, nullable), created_at
--
-- goals
--   id, user_id (FK profiles), goal_type, target_value (numeric), unit, target_date (date),
--   is_active (bool default true), created_at
--
-- After tables: RLS on all; policies for own rows; indexes as listed; trigger on auth.users → profiles.

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text,
  sport_type text,
  weight_kg numeric,
  height_cm integer,
  age integer,
  sex text,
  daily_calorie_goal integer,
  daily_protein_g numeric,
  training_level text,
  dietary_restrictions text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_auth_user_id_key UNIQUE (auth_user_id)
);

COMMENT ON TABLE public.profiles IS 'App profile linked to auth.users; demographics, sport, and nutrition prefs.';

-- workouts: unified sessions from HealthKit, Strava, or manual entry

CREATE TABLE public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  source text NOT NULL,
  activity_type text,
  duration_seconds integer,
  distance_meters numeric,
  calories_burned numeric,
  avg_heart_rate integer,
  elevation_gain_m numeric,
  sweat_rate_ml_hr numeric,
  raw_data jsonb,
  started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.workouts IS 'Training sessions; provenance via source, optional raw vendor JSON.';

-- food_logs: meals with optional link to a workout

CREATE TABLE public.food_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  workout_id uuid REFERENCES public.workouts (id) ON DELETE SET NULL,
  meal_type text,
  description text,
  source text NOT NULL,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  sodium_mg numeric,
  potassium_mg numeric,
  magnesium_mg numeric,
  logged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.food_logs IS 'Food intake; optional workout association for peri-workout fueling.';

-- ai_recommendations: Claude outputs with frozen context for audit

CREATE TABLE public.ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  workout_id uuid REFERENCES public.workouts (id) ON DELETE SET NULL,
  trigger_type text,
  recommendation text NOT NULL,
  context_snapshot jsonb NOT NULL DEFAULT '{}',
  was_helpful boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_recommendations IS 'AI recommendations; context_snapshot captures inputs at generation time.';

-- goals: user targets

CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  goal_type text NOT NULL,
  target_value numeric,
  unit text,
  target_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.goals IS 'Numeric or dated goals (macros, weight, race prep, etc.).';

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Policies: users only see/modify rows where they own the profile (auth.uid() = profiles.auth_user_id)

CREATE POLICY "Users can manage own profile row"
  ON public.profiles
  FOR ALL
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can manage own workouts"
  ON public.workouts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = workouts.user_id
        AND p.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = workouts.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own food_logs"
  ON public.food_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = food_logs.user_id
        AND p.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = food_logs.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own ai_recommendations"
  ON public.ai_recommendations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = ai_recommendations.user_id
        AND p.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = ai_recommendations.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own goals"
  ON public.goals
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = goals.user_id
        AND p.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = goals.user_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX workouts_user_id_created_at_idx ON public.workouts (user_id, created_at DESC);
CREATE INDEX workouts_user_id_started_at_idx ON public.workouts (user_id, started_at DESC);

CREATE INDEX food_logs_user_id_created_at_idx ON public.food_logs (user_id, created_at DESC);
CREATE INDEX food_logs_workout_id_idx ON public.food_logs (workout_id);

CREATE INDEX ai_recommendations_user_id_created_at_idx ON public.ai_recommendations (user_id, created_at DESC);
CREATE INDEX ai_recommendations_workout_id_idx ON public.ai_recommendations (workout_id);

CREATE INDEX goals_user_id_created_at_idx ON public.goals (user_id, created_at DESC);

-- Auto-create profile on new auth user (standard Supabase pattern)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      NEW.raw_user_meta_data ->> 'display_name'
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
