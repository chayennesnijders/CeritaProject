-- Update na update-28: moderators. Jij (de eigenaar) kunt in de app bij Beheer → Team iemand
-- moderator maken. Een moderator ziet alleen de Inbox en berichten van leden.
-- Plak dit in Supabase → SQL Editor → New query → Run. Per ongeluk twee keer gedaan? Geen probleem.
BEGIN;

-- ===== 0078_moderators =====
-- The owner can make members "moderator" from the app (Beheer → Team). A moderator helps with the
-- Inbox (reports, care signals, warnings, time-outs) and with messages that members send to the
-- admins. Moderators do NOT see messages from organisations / the contact form, the shop, the log,
-- private chat overviews or anything else in Beheer: the database itself keeps them out.

-- Admin, owner or moderator: everyone who helps with the Inbox.
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin'::app_role, 'owner'::app_role, 'moderator'::app_role))
$$;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

-- Messages from members to the admins.
DROP POLICY IF EXISTS "read own or admin" ON public.admin_messages;
CREATE POLICY "read own or admin" ON public.admin_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.answer_admin_message(_message uuid, _reply text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE answer text := nullif(trim(coalesce(_reply, '')), '');
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Alleen beheerders mogen berichten beantwoorden';
  END IF;
  IF length(answer) > 2000 THEN RAISE EXCEPTION 'Antwoord mag maximaal 2000 tekens bevatten'; END IF;
  IF answer IS NULL THEN
    UPDATE public.admin_messages SET status = 'gelezen' WHERE id = _message AND status = 'nieuw';
  ELSE
    UPDATE public.admin_messages
    SET reply = answer, replied_by = auth.uid(), replied_at = now(), status = 'beantwoord', reply_seen = false
    WHERE id = _message;
  END IF;
  IF NOT FOUND AND answer IS NOT NULL THEN RAISE EXCEPTION 'Bericht niet gevonden'; END IF;
  RETURN _message;
END $$;

-- Reports.
DROP POLICY IF EXISTS "see own or admin" ON public.reports;
CREATE POLICY "see own or admin" ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "admin handles" ON public.reports;
CREATE POLICY "admin handles" ON public.reports FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.respond_report(_report uuid, _action text, _response text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.reports; reply text := trim(coalesce(_response, ''));
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Alleen beheerders mogen meldingen afhandelen'; END IF;
  IF _action NOT IN ('answer', 'reject', 'hide') OR _action IS NULL THEN RAISE EXCEPTION 'Ongeldige actie'; END IF;
  IF length(reply) > 2000 THEN RAISE EXCEPTION 'Antwoord mag maximaal 2000 tekens bevatten'; END IF;
  IF _action = 'answer' AND reply = '' THEN RAISE EXCEPTION 'Schrijf eerst een antwoord'; END IF;
  SELECT * INTO r FROM public.reports WHERE id = _report FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Melding niet gevonden'; END IF;
  IF r.status <> 'open' THEN RAISE EXCEPTION 'Deze melding is al afgehandeld'; END IF;
  IF _action = 'hide' THEN
    IF r.post_id IS NULL THEN RAISE EXCEPTION 'Dit bericht kan niet worden verborgen'; END IF;
    UPDATE public.posts SET is_hidden = true WHERE id = r.post_id;
  END IF;
  IF reply = '' THEN
    reply := CASE WHEN _action = 'reject' THEN 'Je melding is bekeken en afgekeurd door een beheerder.'
                  ELSE 'Je melding is bekeken. Het gemelde bericht is verborgen.' END;
  END IF;
  UPDATE public.reports
  SET response = reply, responded_by = auth.uid(), responded_at = now(),
      status = CASE _action WHEN 'reject' THEN 'afgewezen' WHEN 'hide' THEN 'actie' ELSE 'beantwoord' END
  WHERE id = _report;
  RETURN _report;
END $$;

CREATE OR REPLACE FUNCTION public.guard_report_response()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.response IS NOT NULL OR NEW.responded_by IS NOT NULL OR NEW.responded_at IS NOT NULL OR NEW.status <> 'open' THEN
      RAISE EXCEPTION 'Meldingen moeten open en zonder antwoord worden ingediend';
    END IF;
  ELSIF (NEW.response, NEW.responded_by, NEW.responded_at) IS DISTINCT FROM (OLD.response, OLD.responded_by, OLD.responded_at) THEN
    IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Alleen beheerders mogen antwoorden'; END IF;
    IF NEW.responded_by IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Ongeldige beheerder'; END IF;
  END IF;
  RETURN NEW;
END $$;

-- A moderator may read a group post only when it was reported (to judge the report).
DROP POLICY IF EXISTS "moderators read reported posts" ON public.posts;
CREATE POLICY "moderators read reported posts" ON public.posts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') AND EXISTS (SELECT 1 FROM public.reports r WHERE r.post_id = posts.id));

-- Care signals.
DROP POLICY IF EXISTS "admins see alerts" ON public.safety_alerts;
CREATE POLICY "admins see alerts" ON public.safety_alerts FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "admins handle alerts" ON public.safety_alerts;
CREATE POLICY "admins handle alerts" ON public.safety_alerts FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Warnings and time-outs.
DROP POLICY IF EXISTS "read warnings" ON public.member_warnings;
CREATE POLICY "read warnings" ON public.member_warnings FOR SELECT TO authenticated
  USING (member_id = auth.uid() OR public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "admins warn members" ON public.member_warnings;
CREATE POLICY "admins warn members" ON public.member_warnings FOR INSERT TO authenticated
  WITH CHECK (admin_id = auth.uid() AND public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "read timeouts" ON public.member_timeouts;
CREATE POLICY "read timeouts" ON public.member_timeouts FOR SELECT TO authenticated
  USING (member_id = auth.uid() OR public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "admins give timeouts" ON public.member_timeouts;
CREATE POLICY "admins give timeouts" ON public.member_timeouts FOR INSERT TO authenticated
  WITH CHECK (admin_id = auth.uid() AND public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "admins end timeouts" ON public.member_timeouts;
CREATE POLICY "admins end timeouts" ON public.member_timeouts FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

-- Names of members (reports and messages come from every age band).
DROP POLICY IF EXISTS "see own, same-age, or admin" ON public.profiles;
CREATE POLICY "see own, same-age, or admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()) OR age_group = public.my_age_group());

-- Moderators also get the 🛡️ next to their name, so members know who helps.
CREATE OR REPLACE FUNCTION public.admin_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin', 'owner', 'moderator')
$$;

-- Owner only: who helps (admins and moderators).
CREATE OR REPLACE FUNCTION public.staff_list()
RETURNS TABLE (user_id uuid, display_name text, username text, roles text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN RAISE EXCEPTION 'Alleen de eigenaar'; END IF;
  RETURN QUERY
    SELECT p.id, p.display_name, p.username, array_agg(ur.role::text ORDER BY ur.role::text)
    FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.role IN ('admin', 'owner', 'moderator')
    GROUP BY p.id, p.display_name, p.username
    ORDER BY p.display_name;
END $$;
REVOKE ALL ON FUNCTION public.staff_list() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_list() TO authenticated;

-- Owner only: make a member moderator by @username (_on = true), or take the role away (_on = false).
-- Making someone moderator also ends a full admin role they had, so they only see the Inbox.
-- The owner's own roles are never touched.
CREATE OR REPLACE FUNCTION public.set_moderator(_username text, _on boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target uuid; name text;
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN RAISE EXCEPTION 'Alleen de eigenaar kan moderators kiezen'; END IF;
  SELECT id, coalesce(display_name, username) INTO target, name
  FROM public.profiles WHERE lower(username) = lower(ltrim(trim(_username), '@'));
  IF target IS NULL THEN RAISE EXCEPTION 'Geen lid gevonden met deze gebruikersnaam'; END IF;
  IF public.is_owner(target) THEN RAISE EXCEPTION 'Dit is de eigenaar'; END IF;
  IF _on THEN
    DELETE FROM public.user_roles WHERE user_id = target AND role = 'admin';
    INSERT INTO public.user_roles (user_id, role) VALUES (target, 'moderator') ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = target AND role IN ('moderator', 'admin');
  END IF;
  INSERT INTO public.activity_log (actor_id, action, target_table, target_id, details)
  VALUES (auth.uid(), CASE WHEN _on THEN 'moderator_added' ELSE 'moderator_removed' END, 'user_roles', target,
          jsonb_build_object('name', name));
  RETURN name;
END $$;
REVOKE ALL ON FUNCTION public.set_moderator(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_moderator(text, boolean) TO authenticated;

COMMIT;
