CREATE TABLE public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null unique,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.daily_challenges TO authenticated;
GRANT ALL ON public.daily_challenges TO service_role;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read challenges" ON public.daily_challenges FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin challenges" ON public.daily_challenges FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id uuid references public.daily_challenges(id) on delete set null,
  body text,
  photo_path text,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diary_entries TO authenticated;
GRANT ALL ON public.diary_entries TO service_role;
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own diary read" ON public.diary_entries FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own diary write" ON public.diary_entries FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own diary delete" ON public.diary_entries FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "own diary photos read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'diary-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own diary photos write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'diary-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own diary photos delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'diary-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.log_admin_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE r jsonb; act text;
BEGIN
  IF TG_OP = 'DELETE' THEN r := to_jsonb(OLD); ELSE r := to_jsonb(NEW); END IF;
  IF TG_TABLE_NAME = 'reports' THEN
    IF TG_OP <> 'UPDATE' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NULL; END IF;
    act := 'report_status';
    r := jsonb_build_object('reason', NEW.reason, 'from', OLD.status, 'to', NEW.status);
  ELSIF TG_TABLE_NAME = 'groups' THEN
    act := 'group_' || lower(TG_OP);
    r := jsonb_build_object('name', r->>'name', 'age_group', r->>'age_group', 'is_archived', r->'is_archived');
  ELSIF TG_TABLE_NAME = 'articles' THEN
    act := 'article_' || lower(TG_OP);
    r := jsonb_build_object('title', r->>'title', 'category', r->>'category', 'is_published', r->'is_published');
  ELSIF TG_TABLE_NAME = 'daily_challenges' THEN
    act := 'challenge_' || lower(TG_OP);
    r := jsonb_build_object('title', r->>'title', 'challenge_date', r->>'challenge_date');
  ELSE
    act := 'quote_' || lower(TG_OP);
    r := jsonb_build_object('text', r->>'text', 'quote_date', r->>'quote_date');
  END IF;
  INSERT INTO public.activity_log (actor_id, action, target_table, target_id, details)
  VALUES (auth.uid(), act, TG_TABLE_NAME, (CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END), r);
  RETURN NULL;
END $function$;

CREATE TRIGGER log_challenges AFTER INSERT OR UPDATE OR DELETE ON public.daily_challenges FOR EACH ROW EXECUTE FUNCTION public.log_admin_activity();

COMMENT ON TABLE public.daily_quotes IS 'DEPRECATED: vervangen door daily_challenges (dagopdracht + dagboek).';