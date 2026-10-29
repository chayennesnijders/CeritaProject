CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  target_table text NOT NULL,
  target_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read log" ON public.activity_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX activity_log_created_idx ON public.activity_log (created_at DESC);

CREATE OR REPLACE FUNCTION public.log_admin_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  ELSE
    act := 'quote_' || lower(TG_OP);
    r := jsonb_build_object('text', r->>'text', 'quote_date', r->>'quote_date');
  END IF;
  INSERT INTO public.activity_log (actor_id, action, target_table, target_id, details)
  VALUES (auth.uid(), act, TG_TABLE_NAME, (CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END), r);
  RETURN NULL;
END $$;

CREATE TRIGGER log_reports AFTER UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.log_admin_activity();
CREATE TRIGGER log_groups AFTER INSERT OR UPDATE OR DELETE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.log_admin_activity();
CREATE TRIGGER log_quotes AFTER INSERT OR UPDATE OR DELETE ON public.daily_quotes FOR EACH ROW EXECUTE FUNCTION public.log_admin_activity();