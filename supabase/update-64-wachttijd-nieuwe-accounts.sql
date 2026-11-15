-- Update na update-63: nieuwe accounts kunnen de eerste 3 dagen nog geen privéchat starten met
-- jongeren onder de 18. Meedoen in groepen kan meteen. Coaches en beheerders zijn uitgezonderd.
-- Plak dit in Supabase → SQL Editor en klik Run. Je kunt het veilig vaker draaien.

CREATE OR REPLACE FUNCTION public.wait_new_account_requests() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  requester uuid := NEW.requested_by;
  other uuid := CASE WHEN NEW.user_a = NEW.requested_by THEN NEW.user_b ELSE NEW.user_a END;
BEGIN
  IF requester IS NULL OR public.is_coach(requester) OR public.has_role(requester, 'admin') THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = requester AND p.created_at > now() - interval '3 days')
     AND EXISTS (SELECT 1 FROM public.profiles t WHERE t.id = other
                  AND t.birthdate IS NOT NULL AND date_part('year', age(t.birthdate)) < 18) THEN
    RAISE EXCEPTION 'Nieuwe accounts kunnen de eerste 3 dagen nog geen privéchat starten met jongeren onder de 18.'
      USING HINT = 'nieuw-account';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.wait_new_account_requests() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS wait_new_account_requests ON public.conversations;
CREATE TRIGGER wait_new_account_requests BEFORE INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.wait_new_account_requests();

-- Zodat Beheer → Livegang kan zien dat deze update gedraaid is.
CREATE OR REPLACE FUNCTION public.new_account_wait_days() RETURNS int
LANGUAGE sql IMMUTABLE AS $$ SELECT 3 $$;
GRANT EXECUTE ON FUNCTION public.new_account_wait_days() TO authenticated;
