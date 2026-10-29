-- Ready for working with organisations: consent per member, care signals for admins, and
-- anonymous impact numbers. Consent lives in its own table so other members never see it.
CREATE TABLE IF NOT EXISTS public.user_consents (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  terms_version text NOT NULL,
  terms_accepted_at timestamptz NOT NULL DEFAULT now(),
  parent_confirmed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.user_consents TO authenticated;
GRANT ALL ON public.user_consents TO service_role;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own consent" ON public.user_consents;
CREATE POLICY "own consent" ON public.user_consents FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "admins read consent" ON public.user_consents;
CREATE POLICY "admins read consent" ON public.user_consents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
--> statement-breakpoint
-- Care signals: words about suicide or self-harm in group posts, comments or private messages
-- are flagged for the admins, so someone can reach out. Only admins see them.
CREATE TABLE IF NOT EXISTS public.safety_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('post', 'comment', 'dm')),
  ref_id uuid NOT NULL,
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  excerpt text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'afgehandeld')),
  handled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.safety_alerts TO authenticated;
GRANT ALL ON public.safety_alerts TO service_role;
ALTER TABLE public.safety_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins see alerts" ON public.safety_alerts;
CREATE POLICY "admins see alerts" ON public.safety_alerts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins handle alerts" ON public.safety_alerts;
CREATE POLICY "admins handle alerts" ON public.safety_alerts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
--> statement-breakpoint
-- Same words as needsCare() in src/lib/care.ts.
CREATE OR REPLACE FUNCTION public.needs_care(_text text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$ SELECT coalesce(_text, '') ~* $re$(zelfmoord|zelfdoding|su[iï]cid|zelfbeschadig|zelfverwond|dood\s+(gaan\s+)?willen|wil\s+(\S+\s+){0,2}dood|er\s+niet\s+meer\s+(wil\s+|willen\s+)?zijn|niet\s+meer\s+(willen\s+)?leven|zie\s+het\s+(\S+\s+){0,2}niet\s+meer\s+zitten|mezelf\s+(\S+\s+){0,2}(snijden|gesneden|pijn\s+doen|iets\s+aan\s*doen|van\s+kant\s+maken|ophangen)|snij\S*\s+(\S+\s+){0,2}mezelf|einde\s+aan\s+(mijn|m'?n)\s+leven|niemand\s+zou\s+me\s+missen|beter\s+af\s+zonder\s+mij)$re$ $$;
CREATE OR REPLACE FUNCTION public.flag_care() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.needs_care(NEW.body) THEN
    INSERT INTO public.safety_alerts (source, ref_id, author_id, excerpt)
    VALUES (TG_ARGV[0], NEW.id, coalesce(to_jsonb(NEW)->>'author_id', to_jsonb(NEW)->>'sender_id')::uuid, left(NEW.body, 300));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.flag_care() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS flag_care ON public.posts;
CREATE TRIGGER flag_care AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.flag_care('post');
DROP TRIGGER IF EXISTS flag_care ON public.post_comments;
CREATE TRIGGER flag_care AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.flag_care('comment');
DROP TRIGGER IF EXISTS flag_care ON public.direct_messages;
CREATE TRIGGER flag_care AFTER INSERT ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.flag_care('dm');
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.admin_news(_days integer DEFAULT 30)
RETURNS TABLE (kind text, ref_id uuid, title text, detail text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM (
    SELECT 'aanmelding'::text, p.id, p.display_name,
           coalesce('@' || p.username, '') AS detail, p.created_at
    FROM public.profiles p
    UNION ALL
    SELECT 'bestelling', o.id, coalesce(sp.name, o.product),
           o.ship_name || CASE WHEN o.amount_cents > 0 THEN ' · €' || replace(to_char(o.amount_cents / 100.0, 'FM999990.00'), '.', ',') ELSE ' · gratis' END,
           o.created_at
    FROM public.shop_orders o
    LEFT JOIN public.shop_products sp ON sp.id = o.product_id
    WHERE public.is_owner(auth.uid())
    UNION ALL
    SELECT 'verhaal', s.id, s.title,
           CASE WHEN s.may_publish THEN 'Mag gepubliceerd worden' ELSE 'Geen toestemming om te publiceren' END,
           s.created_at
    FROM public.story_submissions s
    UNION ALL
    SELECT 'bericht', m.id, left(m.body, 120), coalesce(p.display_name, 'Lid'), m.created_at
    FROM public.admin_messages m LEFT JOIN public.profiles p ON p.id = m.user_id
    UNION ALL
    SELECT 'zorg', a.id, a.excerpt, coalesce(p.display_name, 'Lid') || CASE a.source WHEN 'dm' THEN ' · privégesprek' WHEN 'comment' THEN ' · reactie in groep' ELSE ' · bericht in groep' END, a.created_at
    FROM public.safety_alerts a LEFT JOIN public.profiles p ON p.id = a.author_id
    UNION ALL
    SELECT 'melding', r.id, left(r.reason, 120),
           CASE WHEN r.status = 'open' THEN 'Nog niet afgehandeld' ELSE 'Afgehandeld' END, r.created_at
    FROM public.reports r
  ) news(kind, ref_id, title, detail, created_at)
  WHERE public.has_role(auth.uid(), 'admin')
    AND news.created_at > now() - make_interval(days => least(greatest(_days, 1), 365))
  ORDER BY news.created_at DESC
  LIMIT 200
$$;
REVOKE ALL ON FUNCTION public.admin_news(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_news(integer) TO authenticated;
--> statement-breakpoint
-- Anonymous numbers for partners. Counts below 5 come back as -1 ("less than 5") so nobody can be recognised.
CREATE OR REPLACE FUNCTION public.impact_stats() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Alleen voor beheerders'; END IF;
  WITH active AS (
    SELECT author_id AS u, created_at FROM public.posts
    UNION ALL SELECT author_id, created_at FROM public.post_comments
    UNION ALL SELECT sender_id, created_at FROM public.direct_messages
    UNION ALL SELECT user_id, created_at FROM public.diary_entries
    UNION ALL SELECT user_id, read_at FROM public.article_reads
    UNION ALL SELECT user_id, care_date::timestamptz FROM public.pet_care
  ),
  s AS (SELECT CASE WHEN n < 5 THEN -1 ELSE n END AS v, k FROM (
    SELECT 'leden' AS k, count(*)::int AS n FROM public.profiles
    UNION ALL SELECT 'nieuw_30d', count(*)::int FROM public.profiles WHERE created_at > now() - interval '30 days'
    UNION ALL SELECT 'actief_7d', count(DISTINCT u)::int FROM active WHERE created_at > now() - interval '7 days'
    UNION ALL SELECT 'actief_30d', count(DISTINCT u)::int FROM active WHERE created_at > now() - interval '30 days'
    UNION ALL SELECT 'band_12_15', count(*)::int FROM public.profiles WHERE age_group = 'junior'
    UNION ALL SELECT 'band_16_25', count(*)::int FROM public.profiles WHERE age_group = 'senior'
    UNION ALL SELECT 'band_26_27', count(*)::int FROM public.profiles WHERE age_group = 'adult'
    UNION ALL SELECT 'gelezen_30d', count(*)::int FROM public.article_reads WHERE read_at > now() - interval '30 days'
    UNION ALL SELECT 'gelezen_totaal', count(*)::int FROM public.article_reads
    UNION ALL SELECT 'reacties_steun', count(*)::int FROM public.article_reactions
    UNION ALL SELECT 'dagboek_30d', count(*)::int FROM public.diary_entries WHERE created_at > now() - interval '30 days'
    UNION ALL SELECT 'groepsberichten_30d', count(*)::int FROM public.posts WHERE created_at > now() - interval '30 days'
    UNION ALL SELECT 'verhalen_ingestuurd', count(*)::int FROM public.story_submissions
    UNION ALL SELECT 'berichten_beheer', count(*)::int FROM public.admin_messages
    UNION ALL SELECT 'zorgsignalen_30d', count(*)::int FROM public.safety_alerts WHERE created_at > now() - interval '30 days'
  ) x)
  SELECT jsonb_build_object(
    'cijfers', (SELECT jsonb_object_agg(k, v) FROM s),
    'onderwerpen', coalesce((
      SELECT jsonb_agg(jsonb_build_object('category', category, 'n', CASE WHEN n < 5 THEN -1 ELSE n END) ORDER BY n DESC)
      FROM (SELECT a.category, count(*)::int AS n FROM public.article_reads r JOIN public.articles a ON a.id = r.article_id
            WHERE r.read_at > now() - interval '90 days' GROUP BY a.category) t), '[]'::jsonb),
    'gemaakt_op', now()
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.impact_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.impact_stats() TO authenticated;
