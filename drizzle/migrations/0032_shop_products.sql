CREATE TABLE public.shop_products (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  emoji text NOT NULL DEFAULT '🛍️',
  category text NOT NULL DEFAULT 'fidgets' CHECK (category IN ('fidgets','journals','kleding')),
  kind text NOT NULL DEFAULT 'fysiek' CHECK (kind IN ('fysiek','digitaal')),
  cost_cents integer NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
  profit_cents integer NOT NULL DEFAULT 100 CHECK (profit_cents >= 0),
  is_active boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_products TO authenticated;
GRANT ALL ON public.shop_products TO service_role;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leden zien actieve producten" ON public.shop_products FOR SELECT TO authenticated USING (is_active OR public.has_role(auth.uid(),'admin'));

ALTER TABLE public.shop_orders ADD COLUMN product_id text;

INSERT INTO public.shop_products (id, name, description, emoji, category, kind, cost_cents, profit_cents, sort) VALUES
  ('game_clicks', 'Game Clicks', 'Klik-sleutelhanger met vier gameknopjes. Lekker friemelen op school, in de bus of als je even onrustig bent. Wordt opgestuurd met DHL.', '🎮', 'fidgets', 'fysiek', 260, 100, 1),
  ('journal_rust', 'Rust-journal (printbaar)', 'VOORBEELD — Printbare journal met dagelijkse vragen om rust in je hoofd te krijgen. Je ontvangt een pdf om zelf te printen.', '📓', 'journals', 'digitaal', 0, 100, 2),
  ('journal_dromen', 'Dromen-journal (printbaar)', 'VOORBEELD — Printbare journal om je doelen en dromen bij te houden, met weekoverzichten. Je ontvangt een pdf om zelf te printen.', '✨', 'journals', 'digitaal', 0, 100, 3);