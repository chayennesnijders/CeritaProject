CREATE TABLE public.shop_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product text NOT NULL DEFAULT 'game_clicks',
  kind text NOT NULL CHECK (kind IN ('paid','gift','free')),
  amount_cents integer NOT NULL DEFAULT 0,
  stripe_session_id text UNIQUE,
  ship_name text NOT NULL,
  ship_street text NOT NULL,
  ship_postcode text NOT NULL,
  ship_city text NOT NULL,
  status text NOT NULL DEFAULT 'nieuw' CHECK (status IN ('nieuw','verzonden')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.shop_orders TO authenticated;
GRANT ALL ON public.shop_orders TO service_role;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own orders" ON public.shop_orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update orders" ON public.shop_orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.free_items_available() RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(0, (SELECT count(*) FROM shop_orders WHERE kind='gift') - (SELECT count(*) FROM shop_orders WHERE kind='free'))::int;
$$;
GRANT EXECUTE ON FUNCTION public.free_items_available() TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_free_item(_name text, _street text, _postcode text, _city text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  PERFORM pg_advisory_xact_lock(424242);
  IF EXISTS (SELECT 1 FROM shop_orders WHERE user_id = auth.uid() AND kind='free') THEN
    RAISE EXCEPTION 'Je hebt al een gratis exemplaar besteld';
  END IF;
  IF free_items_available() < 1 THEN RAISE EXCEPTION 'Er staan nu geen gratis exemplaren klaar'; END IF;
  IF length(trim(_name))=0 OR length(trim(_street))=0 OR length(trim(_postcode))=0 OR length(trim(_city))=0 THEN
    RAISE EXCEPTION 'Vul je adres helemaal in';
  END IF;
  INSERT INTO shop_orders(user_id, kind, ship_name, ship_street, ship_postcode, ship_city)
  VALUES (auth.uid(), 'free', _name, _street, _postcode, _city) RETURNING id INTO new_id;
  RETURN new_id;
END $$;
GRANT EXECUTE ON FUNCTION public.claim_free_item(text,text,text,text) TO authenticated;