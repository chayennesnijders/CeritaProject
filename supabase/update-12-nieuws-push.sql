-- Update na update-11: pushmeldingen voor beheerders bij nieuws.
-- Plak dit in Supabase → SQL Editor → New query → Run. Per ongeluk twee keer gedaan? Geen probleem.
-- Daarna zet je het aan in de app: Beheer → Nieuws → Pushmeldingen.

-- ===== 0061_admin_news_push =====
-- Push for admins when there is news. Each admin turns it on for themselves in Beheer → Nieuws;
-- the app then schedules a check every 5 minutes on its own address.
ALTER TABLE public.admin_news_seen ADD COLUMN IF NOT EXISTS push boolean NOT NULL DEFAULT false;
INSERT INTO public.cron_tokens(name) VALUES ('admin_news_push') ON CONFLICT (name) DO NOTHING;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.admin_push_state (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_run timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_push_state TO service_role;
ALTER TABLE public.admin_push_state ENABLE ROW LEVEL SECURITY;
INSERT INTO public.admin_push_state(id) VALUES (1) ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.schedule_admin_news_push(site_url text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  RETURN cron.schedule('admin-news-push', '*/5 * * * *', format($job$
    SELECT net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(SELECT token FROM public.cron_tokens WHERE name='admin_news_push')),
      body := '{}'::jsonb)
    WHERE EXISTS (SELECT 1 FROM public.admin_news_seen WHERE push);
  $job$, rtrim(site_url, '/') || '/api/public/admin-news-push'));
END
$fn$;
REVOKE ALL ON FUNCTION public.schedule_admin_news_push(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_admin_news_push(text) TO service_role;
