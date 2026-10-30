-- Returns in the shop: a member asks for a return within 30 days of ordering, the owner mails the
-- return address, and refunds via Stripe once the package is back. Only the member and the owner see a return.
CREATE TABLE IF NOT EXISTS public.shop_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT '' CHECK (char_length(reason) <= 1000),
  contact_email text NOT NULL CHECK (char_length(contact_email) <= 200),
  status text NOT NULL DEFAULT 'aangevraagd' CHECK (status IN ('aangevraagd', 'adres_gestuurd', 'ontvangen', 'terugbetaald', 'afgewezen')),
  refund_cents integer CHECK (refund_cents >= 0),
  note text CHECK (char_length(note) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_returns TO authenticated;
GRANT ALL ON public.shop_returns TO service_role;
ALTER TABLE public.shop_returns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own returns or owner" ON public.shop_returns;
CREATE POLICY "own returns or owner" ON public.shop_returns FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_owner(auth.uid()));
--> statement-breakpoint
-- Members ask for a return through this check: their own paid order, at most 30 days old, once.
CREATE OR REPLACE FUNCTION public.request_return(_order uuid, _reason text, _email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.shop_orders; new_id uuid;
BEGIN
  SELECT * INTO o FROM public.shop_orders WHERE id = _order AND user_id = auth.uid();
  IF NOT FOUND OR o.kind <> 'paid' THEN RAISE EXCEPTION 'Deze bestelling kun je niet retourneren'; END IF;
  IF o.created_at < now() - interval '30 days' THEN RAISE EXCEPTION 'De retourtermijn is voorbij'; END IF;
  IF coalesce(trim(_email), '') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Vul een geldig e-mailadres in'; END IF;
  INSERT INTO public.shop_returns (order_id, user_id, reason, contact_email)
  VALUES (_order, auth.uid(), left(coalesce(trim(_reason), ''), 1000), trim(_email))
  RETURNING id INTO new_id;
  RETURN new_id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Je hebt voor deze bestelling al een retour aangevraagd';
END $$;
REVOKE ALL ON FUNCTION public.request_return(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_return(uuid, text, text) TO authenticated;
--> statement-breakpoint
-- The owner moves a return along (address sent, received, refused). Refunding itself goes via the server (Stripe).
CREATE OR REPLACE FUNCTION public.set_return_status(_return uuid, _status text, _note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN RAISE EXCEPTION 'Alleen de eigenaar beheert retouren'; END IF;
  IF _status NOT IN ('aangevraagd', 'adres_gestuurd', 'ontvangen', 'afgewezen') THEN RAISE EXCEPTION 'Ongeldige status'; END IF;
  UPDATE public.shop_returns SET status = _status, note = coalesce(_note, note), updated_at = now()
  WHERE id = _return AND status <> 'terugbetaald';
  IF NOT FOUND THEN RAISE EXCEPTION 'Retour niet gevonden of al terugbetaald'; END IF;
  RETURN _return;
END $$;
REVOKE ALL ON FUNCTION public.set_return_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_return_status(uuid, text, text) TO authenticated;
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
    SELECT 'retour', r.id, o.product, coalesce(p.display_name, 'Lid') || coalesce(' · ' || nullif(left(r.reason, 80), ''), ''), r.created_at
    FROM public.shop_returns r JOIN public.shop_orders o ON o.id = r.order_id LEFT JOIN public.profiles p ON p.id = r.user_id
    WHERE public.is_owner(auth.uid())
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
