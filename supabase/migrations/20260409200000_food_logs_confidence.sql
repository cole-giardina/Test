-- Optional AI parse confidence for natural-language food logs.
ALTER TABLE public.food_logs
  ADD COLUMN IF NOT EXISTS confidence text;

COMMENT ON COLUMN public.food_logs.confidence IS 'AI parse confidence when source is ai (high|medium|low); null otherwise.';
