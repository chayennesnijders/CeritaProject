ALTER TABLE public.shop_orders ADD COLUMN points integer NOT NULL DEFAULT 0;
ALTER TABLE public.shop_orders ADD COLUMN tier text;
CREATE TABLE public.cron_tokens (name text PRIMARY KEY, token text NOT NULL DEFAULT encode(gen_random_bytes(24),'hex'));
GRANT ALL ON public.cron_tokens TO service_role;
ALTER TABLE public.cron_tokens ENABLE ROW LEVEL SECURITY;
INSERT INTO public.cron_tokens(name) VALUES ('free_items_weekly');
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('free-items-weekly', '0 16 * * 1', $$
  SELECT net.http_post(
    url := 'https://project--74b0fbcb-8a92-4328-b6bf-974e228fdbb6.lovable.app/api/public/free-items-weekly',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(SELECT token FROM public.cron_tokens WHERE name='free_items_weekly')),
    body := '{}'::jsonb)
  WHERE public.free_items_available() > 0;
$$);