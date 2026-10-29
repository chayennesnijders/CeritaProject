-- Update na update-12: berichten aan de beheerders, en de eerste berichten worden artikelen.
-- Plak dit in Supabase → SQL Editor → New query → Run. Per ongeluk twee keer gedaan? Geen probleem.

-- ===== 0062_admin_messages =====
-- Members can send a message to the admins (a question, something they want to share);
-- admins answer in Beheer → Berichten, and only the sender sees the answer.
CREATE TABLE IF NOT EXISTS public.admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic text NOT NULL DEFAULT 'vraag' CHECK (topic IN ('vraag', 'idee', 'probleem', 'iets-anders')),
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 2 AND 2000),
  status text NOT NULL DEFAULT 'nieuw' CHECK (status IN ('nieuw', 'gelezen', 'beantwoord')),
  reply text,
  replied_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  replied_at timestamptz,
  reply_seen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_messages_user_idx ON public.admin_messages (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.admin_messages TO authenticated;
GRANT ALL ON public.admin_messages TO service_role;
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "send own message" ON public.admin_messages;
CREATE POLICY "send own message" ON public.admin_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'nieuw' AND reply IS NULL AND replied_by IS NULL AND replied_at IS NULL);
DROP POLICY IF EXISTS "read own or admin" ON public.admin_messages;
CREATE POLICY "read own or admin" ON public.admin_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
--> statement-breakpoint
-- Admins: mark as read or answer, in one checked step.
CREATE OR REPLACE FUNCTION public.answer_admin_message(_message uuid, _reply text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE answer text := nullif(trim(coalesce(_reply, '')), '');
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Alleen beheerders mogen berichten beantwoorden';
  END IF;
  IF length(answer) > 2000 THEN RAISE EXCEPTION 'Antwoord mag maximaal 2000 tekens bevatten'; END IF;
  IF answer IS NULL THEN
    UPDATE public.admin_messages SET status = 'gelezen' WHERE id = _message AND status = 'nieuw';
  ELSE
    UPDATE public.admin_messages
    SET reply = answer, replied_by = auth.uid(), replied_at = now(), status = 'beantwoord', reply_seen = false
    WHERE id = _message;
  END IF;
  IF NOT FOUND AND answer IS NOT NULL THEN RAISE EXCEPTION 'Bericht niet gevonden'; END IF;
  RETURN _message;
END $$;
REVOKE ALL ON FUNCTION public.answer_admin_message(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.answer_admin_message(uuid, text) TO authenticated;
--> statement-breakpoint
-- Members: mark the answers to your own messages as seen.
CREATE OR REPLACE FUNCTION public.mark_admin_replies_seen()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.admin_messages SET reply_seen = true
  WHERE user_id = auth.uid() AND reply IS NOT NULL AND NOT reply_seen
$$;
REVOKE ALL ON FUNCTION public.mark_admin_replies_seen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_admin_replies_seen() TO authenticated;
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

-- Eenmalig: de eerste berichten (niet van WordPress) zijn artikelen, en krijgen een onderwerp dat de app kent.
UPDATE public.articles SET kind = 'artikel' WHERE wp_id IS NULL AND kind = 'verhaal';
UPDATE public.articles SET category = 'jong-zijn' WHERE category IN ('verhaal', 'tips') AND title NOT ILIKE '%gesprek%';
UPDATE public.articles SET category = 'relaties' WHERE category IN ('verhaal', 'tips');

-- Controle: zo veel verhalen en artikelen staan er nu.
SELECT kind, count(*) FROM public.articles GROUP BY kind;
