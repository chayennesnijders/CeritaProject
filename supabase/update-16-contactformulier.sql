-- Update na update-15: contactformulier voor ouders en organisaties.
-- Plak dit in Supabase → SQL Editor → New query → Run. Per ongeluk twee keer gedaan? Geen probleem.

-- ===== 0065_public_messages =====
-- "Contact" form for people without an account (parents, organisations): anyone may send a message,
-- only admins can read it. A honeypot in the app and a limit here keep spam out.
CREATE TABLE IF NOT EXISTS public.public_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_type text NOT NULL DEFAULT 'anders' CHECK (sender_type IN ('ouder', 'organisatie', 'jongere', 'anders')),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
  email text NOT NULL CHECK (char_length(email) <= 200 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  organisation text CHECK (char_length(organisation) <= 150),
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 5 AND 3000),
  status text NOT NULL DEFAULT 'nieuw' CHECK (status IN ('nieuw', 'afgehandeld')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.public_messages TO anon, authenticated;
GRANT SELECT, UPDATE ON public.public_messages TO authenticated;
GRANT ALL ON public.public_messages TO service_role;
ALTER TABLE public.public_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone sends" ON public.public_messages;
CREATE POLICY "anyone sends" ON public.public_messages FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'nieuw');
DROP POLICY IF EXISTS "admins read" ON public.public_messages;
CREATE POLICY "admins read" ON public.public_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins handle" ON public.public_messages;
CREATE POLICY "admins handle" ON public.public_messages FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
--> statement-breakpoint
-- At most 30 messages per hour in total, so a spam bot cannot flood the inbox.
CREATE OR REPLACE FUNCTION public.public_messages_limit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.public_messages WHERE created_at > now() - interval '1 hour') >= 30 THEN
    RAISE EXCEPTION 'Het is even te druk. Probeer het over een uur opnieuw.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS public_messages_limit ON public.public_messages;
CREATE TRIGGER public_messages_limit BEFORE INSERT ON public.public_messages
  FOR EACH ROW EXECUTE FUNCTION public.public_messages_limit();
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
    SELECT 'contact', c.id, left(c.body, 120), c.name || ' · ' || c.sender_type, c.created_at
    FROM public.public_messages c
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
