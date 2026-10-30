-- Update na update-26: coaches beantwoorden de anonieme vragen.
-- Plak dit in Supabase → SQL Editor → New query → Run. Per ongeluk twee keer gedaan? Geen probleem.

-- ===== 0076_coaches =====
-- Coaches answer the anonymous questions. Admins add a coach by username; a coach sees the open
-- questions (never who asked), answers them under their coach name, and gets a push for new ones.
CREATE TABLE IF NOT EXISTS public.coaches (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 40),
  bio text CHECK (char_length(bio) <= 200),
  active boolean NOT NULL DEFAULT true,
  added_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaches TO authenticated;
GRANT ALL ON public.coaches TO service_role;
DROP POLICY IF EXISTS "everyone sees coaches" ON public.coaches;
CREATE POLICY "everyone sees coaches" ON public.coaches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admins manage coaches" ON public.coaches;
CREATE POLICY "admins manage coaches" ON public.coaches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.is_coach(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.coaches WHERE user_id = _user AND active)
$$;
REVOKE ALL ON FUNCTION public.is_coach(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_coach(uuid) TO authenticated;

-- Admins: make someone a coach by their @username.
CREATE OR REPLACE FUNCTION public.add_coach(_username text, _title text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Alleen beheerders.'; END IF;
  SELECT id INTO uid FROM public.profiles WHERE lower(username) = lower(ltrim(btrim(_username), '@'));
  IF uid IS NULL THEN RAISE EXCEPTION 'Geen lid gevonden met deze gebruikersnaam.'; END IF;
  INSERT INTO public.coaches (user_id, title, added_by) VALUES (uid, btrim(_title), auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET title = excluded.title, active = true;
  RETURN uid;
END $$;
REVOKE ALL ON FUNCTION public.add_coach(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_coach(text, text) TO authenticated;

-- Coaches get a push for new questions (sent every 15 minutes with the other reminders).
ALTER TABLE public.anon_questions ADD COLUMN IF NOT EXISTS coaches_notified boolean NOT NULL DEFAULT false;
UPDATE public.anon_questions SET coaches_notified = true WHERE status <> 'nieuw';

-- Questions for coaches and admins, without who asked.
CREATE OR REPLACE FUNCTION public.coach_questions()
RETURNS TABLE (id uuid, body text, age_group public.age_group, status text, answer text, published boolean, answered_by_name text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id, q.body, q.age_group, q.status, q.answer, q.published, c.title, q.created_at
  FROM public.anon_questions q LEFT JOIN public.coaches c ON c.user_id = q.answered_by
  WHERE public.is_coach(auth.uid()) OR public.has_role(auth.uid(), 'admin')
  ORDER BY q.created_at DESC LIMIT 200
$$;
REVOKE ALL ON FUNCTION public.coach_questions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_questions() TO authenticated;

-- Coaches may answer too (before, only admins).
CREATE OR REPLACE FUNCTION public.answer_question(_question uuid, _answer text, _publish boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a text := nullif(btrim(coalesce(_answer, '')), '');
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.is_coach(auth.uid())) THEN
    RAISE EXCEPTION 'Alleen coaches en beheerders.';
  END IF;
  UPDATE public.anon_questions SET
    status = CASE WHEN a IS NULL THEN 'afgewezen' ELSE 'beantwoord' END,
    answer = a, published = a IS NOT NULL AND coalesce(_publish, false),
    answered_by = auth.uid(), answered_at = now(), answer_seen = false, coaches_notified = true
  WHERE id = _question;
END $$;

-- The wall now also says which coach answered.
DROP FUNCTION IF EXISTS public.question_wall();
CREATE FUNCTION public.question_wall()
RETURNS TABLE (id uuid, body text, answer text, answered_at timestamptz, coach text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id, q.body, q.answer, q.answered_at, c.title FROM public.anon_questions q
  LEFT JOIN public.coaches c ON c.user_id = q.answered_by
  WHERE q.published AND q.status = 'beantwoord' AND q.age_group = public.my_age_group()
  ORDER BY q.answered_at DESC LIMIT 100
$$;
REVOKE ALL ON FUNCTION public.question_wall() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.question_wall() TO authenticated;
