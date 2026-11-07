BEGIN;

CREATE TABLE IF NOT EXISTS public.tester_progress (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('ouder', 'jongere')),
  checks jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(checks) = 'object' AND length(checks::text) <= 4000),
  notes jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(notes) = 'object' AND length(notes::text) <= 12000),
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tester_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "testers beheren eigen lijst" ON public.tester_progress;
CREATE POLICY "testers beheren eigen lijst" ON public.tester_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "beheerders zien alle testers" ON public.tester_progress;
CREATE POLICY "beheerders zien alle testers" ON public.tester_progress FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
REVOKE ALL ON public.tester_progress FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tester_progress TO authenticated;

COMMIT;
