-- Update na update-66: de Cerita Hall of Fame. Ambassadeurs die Legend zijn (100 punten of meer) én zelf
-- 'Zet mij in de Hall of Fame' aanzetten, staan op de pagina /hall-of-fame met hun naam en foto.
-- Plak dit in Supabase → SQL Editor en klik Run. Je kunt het veilig vaker draaien.

ALTER TABLE public.ambassadors ADD COLUMN IF NOT EXISTS hall_of_fame boolean NOT NULL DEFAULT false;

-- Points of one ambassador: sign-ups through their link + approved submissions (same as src/lib/ambassador.ts).
CREATE OR REPLACE FUNCTION public.ambassador_points(_user uuid) RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT count(*) FROM public.waitlist w WHERE w.source = 'amb-' || a.code)
       + (SELECT coalesce(sum(s.points), 0) FROM public.ambassador_submissions s WHERE s.user_id = a.user_id AND s.status = 'goedgekeurd')
  FROM public.ambassadors a WHERE a.user_id = _user
$$;

-- Only the ambassador decides whether they are shown.
CREATE OR REPLACE FUNCTION public.set_hall_of_fame(_on boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.ambassadors SET hall_of_fame = coalesce(_on, false) WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Je bent (nog) geen ambassadeur.'; END IF;
  RETURN coalesce(_on, false);
END $$;

-- The Hall of Fame: active Legends (100+ points, see LEVELS in src/lib/ambassador.ts) who said yes.
-- Only name, photo, start date and points; never username, age or anything else.
CREATE OR REPLACE FUNCTION public.hall_of_fame()
RETURNS TABLE (display_name text, avatar_url text, since timestamptz, points bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.display_name, p.avatar_url, a.created_at, public.ambassador_points(a.user_id)
  FROM public.ambassadors a JOIN public.profiles p ON p.id = a.user_id
  WHERE a.active AND a.hall_of_fame AND public.ambassador_points(a.user_id) >= 100
  ORDER BY 4 DESC, a.created_at
$$;

-- my_ambassador_stats now also says whether you chose the Hall of Fame.
CREATE OR REPLACE FUNCTION public.my_ambassador_stats()
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'code', a.code, 'active', a.active, 'agreed_at', a.agreed_at, 'since', a.created_at, 'hall_of_fame', a.hall_of_fame,
    'signups', (SELECT count(*) FROM public.waitlist w WHERE w.source = 'amb-' || a.code),
    'task_points', (SELECT coalesce(sum(points), 0) FROM public.ambassador_submissions s WHERE s.user_id = a.user_id AND s.status = 'goedgekeurd'),
    'approved', (SELECT count(*) FROM public.ambassador_submissions s WHERE s.user_id = a.user_id AND s.status = 'goedgekeurd'),
    'pending', (SELECT count(*) FROM public.ambassador_submissions s WHERE s.user_id = a.user_id AND s.status = 'ingediend'))
  FROM public.ambassadors a WHERE a.user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.ambassador_points(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_hall_of_fame(boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.hall_of_fame() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_hall_of_fame(boolean), public.hall_of_fame() TO authenticated;
