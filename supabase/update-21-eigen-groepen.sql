-- Update na update-20: leden kunnen zelf groepen maken.
-- Plak dit in Supabase → SQL Editor → New query → Run. Per ongeluk twee keer gedaan? Geen probleem.

-- ===== 0070_member_groups =====
-- Members can start their own group, always in their own age band. The creator becomes the first
-- member, can change the name and description, and can close the group. At most 3 open groups per
-- member, and admins see every new group in Nieuws.
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.create_group(_name text, _description text, _emoji text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  band public.age_group;
  n text := btrim(coalesce(_name, ''));
  d text := nullif(btrim(coalesce(_description, '')), '');
  gid uuid;
BEGIN
  IF me IS NULL OR NOT public.can_use_community() OR public.is_timed_out(me) THEN
    RAISE EXCEPTION 'Je kunt nu geen groep maken.';
  END IF;
  SELECT age_group INTO band FROM public.profiles WHERE id = me AND birthdate IS NOT NULL;
  IF band IS NULL THEN
    RAISE EXCEPTION 'Vul eerst je geboortedatum in.';
  END IF;
  IF char_length(n) < 3 OR char_length(n) > 40 THEN
    RAISE EXCEPTION 'Kies een naam van 3 tot 40 tekens.';
  END IF;
  IF char_length(coalesce(d, '')) > 140 THEN
    RAISE EXCEPTION 'De omschrijving mag maximaal 140 tekens zijn.';
  END IF;
  IF (SELECT count(*) FROM public.groups WHERE created_by = me AND NOT is_archived) >= 3 THEN
    RAISE EXCEPTION 'Je hebt al 3 groepen. Hef er eerst een op om een nieuwe te maken.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.groups WHERE age_group = band AND NOT is_archived AND lower(name) = lower(n)) THEN
    RAISE EXCEPTION 'Er is al een groep met deze naam.';
  END IF;
  INSERT INTO public.groups (name, description, emoji, age_group, created_by)
  VALUES (n, d, coalesce(nullif(left(btrim(coalesce(_emoji, '')), 8), ''), '💬'), band, me)
  RETURNING id INTO gid;
  INSERT INTO public.group_members (group_id, user_id) VALUES (gid, me);
  RETURN gid;
END $$;

-- The creator changes the name, description or emoji of their own group.
CREATE OR REPLACE FUNCTION public.update_my_group(_group uuid, _name text, _description text, _emoji text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g public.groups;
  n text := btrim(coalesce(_name, ''));
  d text := nullif(btrim(coalesce(_description, '')), '');
BEGIN
  SELECT * INTO g FROM public.groups WHERE id = _group;
  IF g.id IS NULL OR g.created_by IS DISTINCT FROM auth.uid() OR g.is_archived THEN
    RAISE EXCEPTION 'Alleen wie de groep maakte kan hem aanpassen.';
  END IF;
  IF char_length(n) < 3 OR char_length(n) > 40 OR char_length(coalesce(d, '')) > 140 THEN
    RAISE EXCEPTION 'Kies een naam van 3 tot 40 tekens en een omschrijving van maximaal 140.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.groups WHERE age_group = g.age_group AND NOT is_archived AND id <> g.id AND lower(name) = lower(n)) THEN
    RAISE EXCEPTION 'Er is al een groep met deze naam.';
  END IF;
  UPDATE public.groups SET name = n, description = d,
    emoji = coalesce(nullif(left(btrim(coalesce(_emoji, '')), 8), ''), emoji)
  WHERE id = _group;
END $$;

-- The creator closes their group: it disappears from the list (admins can still open it).
CREATE OR REPLACE FUNCTION public.close_my_group(_group uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.groups SET is_archived = true
  WHERE id = _group AND created_by = auth.uid() AND NOT is_archived;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alleen wie de groep maakte kan hem opheffen.';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.create_group(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_my_group(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.close_my_group(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_group(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_group(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_my_group(uuid) TO authenticated;

-- Nieuws for admins: also groups made by members.
CREATE OR REPLACE FUNCTION public.admin_news(_days integer DEFAULT 30)
RETURNS TABLE (kind text, ref_id uuid, title text, detail text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM (
    SELECT 'aanmelding'::text, p.id, p.display_name,
           coalesce('@' || p.username, '') AS detail, p.created_at
    FROM public.profiles p
    UNION ALL
    SELECT 'bestelling', o.id, coalesce(sp.name, o.product),
           o.ship_name || CASE WHEN o.amount_cents > 0 THEN ' · €' || replace(to_char(o.amount_cents / 100.0, 'FM999990.00'), '.', ',') ELSE ' · gratis' END,
           o.created_at
    FROM public.shop_orders o
    LEFT JOIN public.shop_products sp ON sp.id = o.product_id
    WHERE public.is_owner(auth.uid())
    UNION ALL
    SELECT 'verhaal', s.id, s.title,
           CASE WHEN s.may_publish THEN 'Mag gepubliceerd worden' ELSE 'Geen toestemming om te publiceren' END,
           s.created_at
    FROM public.story_submissions s
    UNION ALL
    SELECT 'bericht', m.id, left(m.body, 120), coalesce(p.display_name, 'Lid'), m.created_at
    FROM public.admin_messages m LEFT JOIN public.profiles p ON p.id = m.user_id
    UNION ALL
    SELECT 'zorg', a.id, a.excerpt, coalesce(p.display_name, 'Lid') || CASE a.source WHEN 'dm' THEN ' · privégesprek' WHEN 'comment' THEN ' · reactie in groep' ELSE ' · bericht in groep' END, a.created_at
    FROM public.safety_alerts a LEFT JOIN public.profiles p ON p.id = a.author_id
    UNION ALL
    SELECT 'retour', r.id, o.product, coalesce(p.display_name, 'Lid') || coalesce(' · ' || nullif(left(r.reason, 80), ''), ''), r.created_at
    FROM public.shop_returns r JOIN public.shop_orders o ON o.id = r.order_id LEFT JOIN public.profiles p ON p.id = r.user_id
    WHERE public.is_owner(auth.uid())
    UNION ALL
    SELECT 'contact', c.id, left(c.body, 120), c.name || ' · ' || c.sender_type, c.created_at
    FROM public.public_messages c
    UNION ALL
    SELECT 'groep', g.id, g.emoji || ' ' || g.name, coalesce(p.display_name, 'Lid') || ' · ' || g.age_group::text, g.created_at
    FROM public.groups g JOIN public.profiles p ON p.id = g.created_by
    UNION ALL
    SELECT 'melding', r.id, left(r.reason, 120),
           CASE WHEN r.status = 'open' THEN 'Nog niet afgehandeld' ELSE 'Afgehandeld' END, r.created_at
    FROM public.reports r
  ) news(kind, ref_id, title, detail, created_at)
  WHERE public.has_role(auth.uid(), 'admin')
    AND news.created_at > now() - make_interval(days => least(greatest(_days, 1), 365))
  ORDER BY news.created_at DESC
  LIMIT 200
$$;
REVOKE ALL ON FUNCTION public.admin_news(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_news(integer) TO authenticated;
