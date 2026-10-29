-- The weekly push job pointed at the old Lovable-hosted URL. Stop it and let the
-- owner schedule it again for their own site:  SELECT public.schedule_free_items_weekly('https://jouw-site.nl');
DO $$ BEGIN
  PERFORM cron.unschedule('free-items-weekly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.schedule_free_items_weekly(site_url text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  RETURN cron.schedule('free-items-weekly', '0 16 * * 1', format($job$
    SELECT net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(SELECT token FROM public.cron_tokens WHERE name='free_items_weekly')),
      body := '{}'::jsonb)
    WHERE public.free_items_available() > 0;
  $job$, rtrim(site_url, '/') || '/api/public/free-items-weekly'));
END
$fn$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.schedule_free_items_weekly(text) FROM PUBLIC, anon, authenticated;
