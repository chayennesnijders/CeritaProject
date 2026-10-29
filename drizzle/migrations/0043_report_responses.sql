ALTER TABLE public.reports ADD COLUMN response text, ADD COLUMN responded_by uuid REFERENCES public.profiles(id), ADD COLUMN responded_at timestamptz;
CREATE OR REPLACE FUNCTION public.guard_report_response() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
IF TG_OP='INSERT' THEN
IF NEW.response IS NOT NULL OR NEW.responded_by IS NOT NULL OR NEW.responded_at IS NOT NULL OR NEW.status <> 'open' THEN RAISE EXCEPTION 'Meldingen moeten open en zonder antwoord worden ingediend'; END IF;
ELSIF (NEW.response,NEW.responded_by,NEW.responded_at) IS DISTINCT FROM (OLD.response,OLD.responded_by,OLD.responded_at) THEN
IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN RAISE EXCEPTION 'Alleen beheerders mogen antwoorden'; END IF;
IF NEW.responded_by IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Ongeldige beheerder'; END IF;
END IF; RETURN NEW; END $$;
CREATE TRIGGER guard_report_response BEFORE INSERT OR UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.guard_report_response();
CREATE OR REPLACE FUNCTION public.respond_report(_report uuid,_action text,_response text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE r public.reports; reply text := trim(coalesce(_response,'')); BEGIN
IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN RAISE EXCEPTION 'Alleen beheerders mogen meldingen afhandelen'; END IF;
IF _action NOT IN ('answer','reject','hide') OR _action IS NULL THEN RAISE EXCEPTION 'Ongeldige actie'; END IF;
IF length(reply)>2000 THEN RAISE EXCEPTION 'Antwoord mag maximaal 2000 tekens bevatten'; END IF;
IF _action='answer' AND reply='' THEN RAISE EXCEPTION 'Schrijf eerst een antwoord'; END IF;
SELECT * INTO r FROM public.reports WHERE id=_report FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Melding niet gevonden'; END IF;
IF r.status<>'open' THEN RAISE EXCEPTION 'Deze melding is al afgehandeld'; END IF;
IF _action='hide' THEN
IF r.post_id IS NULL THEN RAISE EXCEPTION 'Dit bericht kan niet worden verborgen'; END IF;
UPDATE public.posts SET is_hidden=true WHERE id=r.post_id;
END IF;
IF reply='' THEN reply := CASE WHEN _action='reject' THEN 'Je melding is bekeken en afgekeurd door een beheerder.' ELSE 'Je melding is bekeken. Het gemelde bericht is verborgen.' END; END IF;
UPDATE public.reports SET response=reply,responded_by=auth.uid(),responded_at=now(),status=CASE _action WHEN 'reject' THEN 'afgewezen' WHEN 'hide' THEN 'actie' ELSE 'beantwoord' END WHERE id=_report;
RETURN _report; END $$;
REVOKE ALL ON FUNCTION public.respond_report(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.respond_report(uuid,text,text) TO authenticated;
