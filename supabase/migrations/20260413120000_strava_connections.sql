-- Strava OAuth tokens live server-side only; clients read `profiles.strava_linked` for UI.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS strava_linked boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.strava_linked IS 'True after Strava OAuth completes (tokens in strava_connections).';

CREATE TABLE public.strava_connections (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  athlete_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.strava_connections IS 'Strava OAuth tokens; readable/writable only via service role (RLS enabled, no user policies).';

ALTER TABLE public.strava_connections ENABLE ROW LEVEL SECURITY;

CREATE INDEX strava_connections_athlete_id_idx ON public.strava_connections (athlete_id);
