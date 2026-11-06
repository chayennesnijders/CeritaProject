-- Safety test: a parent's account must never reach young people. Run against a test database
-- (never production): psql -v ON_ERROR_STOP=1 -f supabase/tests/ouders-veiligheid.sql
-- Needs: a member without birthdate and not a coach (P), a young member (Y), and one group.
-- Everything happens in a transaction that is rolled back.
BEGIN;
SELECT id AS p FROM public.profiles WHERE birthdate IS NULL AND NOT public.is_coach(id)
  AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = profiles.id AND r.role <> 'user') LIMIT 1 \gset
SELECT id AS y FROM public.profiles WHERE birthdate IS NOT NULL
  AND date_part('year', age(birthdate)) BETWEEN 13 AND 15 LIMIT 1 \gset
SELECT id AS g FROM public.groups LIMIT 1 \gset
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'p', true);
SELECT public.become_parent();

DO $$ BEGIN
  IF public.can_use_community() THEN RAISE EXCEPTION 'FOUT: ouder kan bij de community'; END IF;
  IF public.my_age_group() IS NOT NULL THEN RAISE EXCEPTION 'FOUT: ouder heeft een leeftijdsgroep'; END IF;
  IF (SELECT count(*) FROM public.groups) > 0 THEN RAISE EXCEPTION 'FOUT: ouder ziet groepen'; END IF;
  IF (SELECT count(*) FROM public.posts) > 0 THEN RAISE EXCEPTION 'FOUT: ouder ziet berichten in groepen'; END IF;
  IF (SELECT count(*) FROM public.profiles WHERE id <> auth.uid()) > 0 THEN RAISE EXCEPTION 'FOUT: ouder ziet andere profielen'; END IF;
  IF (SELECT count(*) FROM public.buddy_suggestions()) > 0 THEN RAISE EXCEPTION 'FOUT: ouder krijgt buddy-suggesties'; END IF;
END $$;
SELECT set_config('test.y', :'y', true);
DO $$ BEGIN
  IF public.can_message(current_setting('test.y')::uuid) THEN RAISE EXCEPTION 'FOUT: ouder kan een jongere een bericht sturen'; END IF;
  IF public.can_call(current_setting('test.y')::uuid) THEN RAISE EXCEPTION 'FOUT: ouder kan een jongere bellen'; END IF;
END $$;

SELECT set_config('test.g', :'g', true);
DO $$ BEGIN
  BEGIN
    INSERT INTO public.group_members(group_id, user_id) VALUES (current_setting('test.g')::uuid, auth.uid());
    RAISE EXCEPTION 'FOUT: ouder kon lid worden van een groep';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.posts(group_id, author_id, body) VALUES (current_setting('test.g')::uuid, auth.uid(), 'hoi');
    RAISE EXCEPTION 'FOUT: ouder kon in een groep schrijven';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.conversations(user_a, user_b, requested_by)
      VALUES (least(auth.uid(), current_setting('test.y')::uuid), greatest(auth.uid(), current_setting('test.y')::uuid), auth.uid());
    RAISE EXCEPTION 'FOUT: ouder kon een chatverzoek sturen aan een jongere';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- Switching back to a young person's account by filling in a birthdate does not work.
UPDATE public.profiles SET is_parent = false, birthdate = '2010-01-01' WHERE id = auth.uid();
DO $$ BEGIN
  IF NOT (SELECT is_parent FROM public.profiles WHERE id = auth.uid()) THEN RAISE EXCEPTION 'FOUT: ouder kon zichzelf omzetten'; END IF;
  IF (SELECT birthdate FROM public.profiles WHERE id = auth.uid()) IS NOT NULL THEN RAISE EXCEPTION 'FOUT: ouder kreeg een geboortedatum'; END IF;
  IF public.can_use_community() THEN RAISE EXCEPTION 'FOUT: ouder kan na omzetpoging bij de community'; END IF;
END $$;

-- A young member cannot make themselves a parent's account (and so cannot lose their safety rules by accident).
SELECT set_config('request.jwt.claim.sub', :'y', true);
DO $$ BEGIN
  BEGIN
    PERFORM public.become_parent();
    RAISE EXCEPTION 'FOUT: jongere kon ouder-account worden';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FOUT:%' THEN RAISE; END IF;
  END;
END $$;
SELECT 'Alle veiligheidstests voor ouder-accounts geslaagd' AS uitkomst;
ROLLBACK;
