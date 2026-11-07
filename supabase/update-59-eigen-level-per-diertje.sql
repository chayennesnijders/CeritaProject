BEGIN;

ALTER TABLE public.companions ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0;
ALTER TABLE public.companions DROP CONSTRAINT IF EXISTS companions_xp_check;
ALTER TABLE public.companions ADD CONSTRAINT companions_xp_check CHECK (xp >= 0);
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS active_ref text NOT NULL DEFAULT 'main';

CREATE OR REPLACE FUNCTION public.companions_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user = 'authenticated' AND pg_trigger_depth() = 1 THEN
    IF TG_OP = 'INSERT' THEN
      NEW.xp := 0;
    ELSIF NEW.xp <> OLD.xp THEN
      NEW.xp := OLD.xp;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS companions_guard ON public.companions;
CREATE TRIGGER companions_guard BEFORE INSERT OR UPDATE ON public.companions FOR EACH ROW EXECUTE FUNCTION public.companions_guard();

CREATE OR REPLACE FUNCTION public.pets_xp_to_active() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target uuid;
BEGIN
  IF NEW.xp > OLD.xp AND NEW.active_ref <> 'main' THEN
    BEGIN
      target := NEW.active_ref::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RETURN NEW;
    END;
    UPDATE public.companions SET xp = xp + (NEW.xp - OLD.xp) WHERE id = target AND user_id = NEW.user_id;
    IF FOUND THEN
      NEW.xp := OLD.xp;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS pets_xp_to_active ON public.pets;
CREATE TRIGGER pets_xp_to_active BEFORE UPDATE OF xp ON public.pets FOR EACH ROW EXECUTE FUNCTION public.pets_xp_to_active();

COMMIT;
