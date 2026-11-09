BEGIN;

-- Alleen de eigenaar: zet een account dat per ongeluk als jongere is aangemaakt om naar een
-- ouder-account. Het lid gaat uit alle groepen, de geboortedatum wordt leeggemaakt (zo is het
-- voor alle ouders) en "ook ouder" gaat uit. Eigenaar, beheerders, moderators en coaches kunnen
-- niet worden omgezet. Wordt vastgelegd in het logboek.
CREATE OR REPLACE FUNCTION public.admin_make_parent(_user uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE name text; was_parent boolean;
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN RAISE EXCEPTION 'Alleen de eigenaar kan accounts omzetten'; END IF;
  SELECT coalesce(display_name, username), is_parent INTO name, was_parent FROM public.profiles WHERE id = _user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dit lid bestaat niet (meer)'; END IF;
  IF was_parent THEN RAISE EXCEPTION 'Dit is al een ouder-account'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user AND role IN ('owner', 'admin', 'moderator')) THEN
    RAISE EXCEPTION 'Teamleden kun je niet omzetten. Haal eerst hun rol weg.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.coaches WHERE user_id = _user AND active) THEN
    RAISE EXCEPTION 'Coaches kun je niet omzetten. Zet de coach eerst uit.';
  END IF;

  DELETE FROM public.group_members WHERE user_id = _user;
  PERFORM set_config('cerita.become_parent', 'on', true);
  UPDATE public.profiles SET is_parent = true, also_parent = false WHERE id = _user;
  PERFORM set_config('cerita.become_parent', '', true);

  INSERT INTO public.activity_log (actor_id, action, target_table, target_id, details)
  VALUES (auth.uid(), 'made_parent', 'profiles', _user, jsonb_build_object('name', name));
  RETURN coalesce(name, 'Dit lid');
END $$;
REVOKE ALL ON FUNCTION public.admin_make_parent(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_make_parent(uuid) TO authenticated;

COMMIT;
