BEGIN;

ALTER TABLE public.safety_alerts ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'zorg';
ALTER TABLE public.safety_alerts DROP CONSTRAINT IF EXISTS safety_alerts_kind_check;
ALTER TABLE public.safety_alerts ADD CONSTRAINT safety_alerts_kind_check CHECK (kind IN ('zorg', 'contact', 'nieuw-account'));
ALTER TABLE public.safety_alerts DROP CONSTRAINT IF EXISTS safety_alerts_source_check;
ALTER TABLE public.safety_alerts ADD CONSTRAINT safety_alerts_source_check CHECK (source IN ('post', 'comment', 'dm', 'vraag', 'account'));

CREATE OR REPLACE FUNCTION public.contact_risk(_text text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $f$ SELECT coalesce(_text, '') ~* $re$(((^|[^0-9])(\+31|0031|0)6[ -]?[0-9]{8}|(stuur|geef|wat is|mag ik)\s+(\S+\s+){0,2}(je|jouw|ur)\s+(nummer|telefoonnummer|06))|((add|voeg)\s+(\S+\s+){0,2}(me|mij)\s+(\S+\s+){0,2}(op|on|via)\s+(snap|snapchat|insta|instagram|whatsapp|telegram|discord|kik)|(wat is|geef|stuur)\s+(\S+\s+){0,2}(je|jouw|ur)\s+(snap|snapchat|insta|instagram|telegram|discord)|(praten|appen|chatten|verder)\s+(\S+\s+){0,3}(op|via)\s+(snap|snapchat|whatsapp|telegram|insta|instagram|discord|kik))|((stuur|send|maak)\s+(\S+\s+){0,3}(foto|fotootje|pic|selfie|plaatje|filmpje)\s+(\S+\s+){0,2}(van jou|van je|van jezelf)|nudes?|naaktfoto|(stuur|send)\s+(\S+\s+){0,2}(nudes?|pics?))|(waar woon je|wat is je adres|in welke straat|op welke school zit je|(zullen|wil je|kom je|gaan)\s+(\S+\s+){0,3}afspreken|ik kom\s+(\S+\s+){0,2}(naar je|bij je)|(webcam|videobellen|facetimen))|(ons geheim|ons geheimpje|(niet|nooit)\s+(\S+\s+){0,4}(tegen|aan)\s+(je\s+)?(ouders|moeder|vader|mama|papa|mentor)\s+(\S+\s+){0,2}(zeggen|vertellen)|hoe oud ben je (echt|eigenlijk)))$re$ $f$;

CREATE TABLE IF NOT EXISTS public.contact_signals (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_signals_sender ON public.contact_signals (sender_id, created_at);
ALTER TABLE public.contact_signals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contact_signals FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.flag_contact() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  other uuid;
  other_age int;
  n int;
BEGIN
  IF NOT public.contact_risk(NEW.body) THEN RETURN NEW; END IF;
  IF public.is_coach(NEW.sender_id) OR public.has_role(NEW.sender_id, 'admin') THEN RETURN NEW; END IF;
  SELECT CASE WHEN c.user_a = NEW.sender_id THEN c.user_b ELSE c.user_a END INTO other
  FROM public.conversations c WHERE c.id = NEW.conversation_id;
  SELECT date_part('year', age(p.birthdate))::int INTO other_age FROM public.profiles p WHERE p.id = other;
  IF other IS NULL OR other_age IS NULL OR other_age >= 18 THEN RETURN NEW; END IF;
  INSERT INTO public.contact_signals (sender_id, recipient_id, message_id) VALUES (NEW.sender_id, other, NEW.id);
  SELECT count(*) INTO n FROM public.contact_signals
  WHERE sender_id = NEW.sender_id AND created_at > now() - interval '7 days';
  IF n >= 2 AND NOT EXISTS (SELECT 1 FROM public.safety_alerts a
      WHERE a.author_id = NEW.sender_id AND a.kind = 'contact' AND a.status = 'open') THEN
    INSERT INTO public.safety_alerts (source, ref_id, author_id, excerpt, kind)
    VALUES ('dm', NEW.id, NEW.sender_id, left(NEW.body, 300), 'contact');
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.flag_contact() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS flag_contact ON public.direct_messages;
CREATE TRIGGER flag_contact AFTER INSERT ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.flag_contact();

CREATE OR REPLACE FUNCTION public.flag_new_account_requests() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  requester uuid := NEW.requested_by;
  n int;
BEGIN
  IF requester IS NULL OR public.is_coach(requester) OR public.has_role(requester, 'admin') THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = requester AND p.created_at > now() - interval '7 days') THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO n FROM public.conversations c
  JOIN public.profiles t ON t.id = CASE WHEN c.user_a = requester THEN c.user_b ELSE c.user_a END
  WHERE c.requested_by = requester AND c.created_at > now() - interval '7 days'
    AND t.birthdate IS NOT NULL AND date_part('year', age(t.birthdate)) < 16;
  IF n >= 3 AND NOT EXISTS (SELECT 1 FROM public.safety_alerts a
      WHERE a.author_id = requester AND a.kind = 'nieuw-account' AND a.status = 'open') THEN
    INSERT INTO public.safety_alerts (source, ref_id, author_id, excerpt, kind)
    VALUES ('account', requester, requester,
      'Nieuw account (jonger dan een week) stuurde al ' || n || ' chatverzoeken aan 13–15-jarigen.', 'nieuw-account');
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.flag_new_account_requests() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS flag_new_account_requests ON public.conversations;
CREATE TRIGGER flag_new_account_requests AFTER INSERT ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.flag_new_account_requests();

CREATE TABLE IF NOT EXISTS public.guide_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guide text NOT NULL CHECK (length(guide) <= 60),
  step int NOT NULL DEFAULT 0,
  plan text NOT NULL DEFAULT '' CHECK (length(plan) <= 500),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, guide)
);
ALTER TABLE public.guide_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "eigen voortgang handleidingen" ON public.guide_progress;
CREATE POLICY "eigen voortgang handleidingen" ON public.guide_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
REVOKE ALL ON public.guide_progress FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_progress TO authenticated;

COMMIT;
