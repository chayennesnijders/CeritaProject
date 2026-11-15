-- Update na update-64: ook leraren geven testfeedback in de app (Beheer → Testers).
-- Plak dit in Supabase → SQL Editor en klik Run. Je kunt het veilig vaker draaien.
ALTER TABLE public.tester_progress DROP CONSTRAINT IF EXISTS tester_progress_role_check;
ALTER TABLE public.tester_progress ADD CONSTRAINT tester_progress_role_check CHECK (role IN ('ouder', 'jongere', 'leraar'));

-- Zodat Beheer → Livegang kan zien dat deze update gedraaid is.
CREATE OR REPLACE FUNCTION public.teacher_testers_ready() RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT true $$;
GRANT EXECUTE ON FUNCTION public.teacher_testers_ready() TO authenticated;
