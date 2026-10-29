-- CeritaProject: de hele database in één keer.
-- Plak dit in Supabase → SQL Editor → New query → Run. Maar één keer uitvoeren, op een leeg project!
-- (Gemaakt uit drizzle/migrations. Na elke stap staat COMMIT, zodat nieuwe enum-waarden meteen bruikbaar zijn.)

-- ===== 0000_cerita_basis =====
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TYPE public.age_group AS ENUM ('junior','senior');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Nieuw lid',
  bio text,
  birthdate date,
  age_group public.age_group NOT NULL DEFAULT 'senior',
  is_private boolean NOT NULL DEFAULT true,
  allow_messages boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.my_age_group()
RETURNS public.age_group LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT age_group FROM public.profiles WHERE id = auth.uid()
$$;

CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "see own, same-age, or admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin') OR (age_group = public.my_age_group()));
CREATE POLICY "update own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.profiles_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE yrs int;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.birthdate IS DISTINCT FROM OLD.birthdate
     AND OLD.birthdate IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    NEW.birthdate := OLD.birthdate;
  END IF;
  IF NEW.birthdate IS NOT NULL THEN
    yrs := date_part('year', age(NEW.birthdate));
    NEW.age_group := CASE WHEN yrs <= 15 THEN 'junior'::public.age_group ELSE 'senior'::public.age_group END;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.age_group := OLD.age_group;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_guard BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.profiles_guard();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, birthdate)
  VALUES (NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name',''), NULLIF(NEW.raw_user_meta_data->>'full_name',''), 'Nieuw lid'),
    NULLIF(NEW.raw_user_meta_data->>'birthdate','')::date);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.daily_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_date date NOT NULL UNIQUE,
  text text NOT NULL,
  author text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_quotes TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.daily_quotes TO authenticated;
GRANT ALL ON public.daily_quotes TO service_role;
ALTER TABLE public.daily_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read quotes" ON public.daily_quotes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin quotes" ON public.daily_quotes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  emoji text DEFAULT '🌸',
  age_group public.age_group NOT NULL,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT ALL ON public.groups TO service_role;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own age groups" ON public.groups FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR (age_group = public.my_age_group() AND NOT is_archived));
CREATE POLICY "admin groups" ON public.groups FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.can_access_group(_group uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.groups g WHERE g.id = _group AND NOT g.is_archived AND g.age_group = public.my_age_group())
$$;

CREATE TABLE public.group_members (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.group_members TO authenticated;
GRANT ALL ON public.group_members TO service_role;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_member(_group uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _group AND user_id = auth.uid())
$$;

CREATE POLICY "see members" ON public.group_members FOR SELECT TO authenticated USING (public.can_access_group(group_id));
CREATE POLICY "join" ON public.group_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.can_access_group(group_id));
CREATE POLICY "leave" ON public.group_members FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read posts" ON public.posts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR (public.can_access_group(group_id) AND (NOT is_hidden OR author_id = auth.uid())));
CREATE POLICY "write posts" ON public.posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_member(group_id) AND public.can_access_group(group_id) AND NOT is_hidden);
CREATE POLICY "delete own posts" ON public.posts FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin moderate posts" ON public.posts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.post_group(_post uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT group_id FROM public.posts WHERE id = _post $$;

CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read comments" ON public.post_comments FOR SELECT TO authenticated USING (public.can_access_group(public.post_group(post_id)));
CREATE POLICY "write comments" ON public.post_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_member(public.post_group(post_id)));
CREATE POLICY "delete comments" ON public.post_comments FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "file report" ON public.reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "see own or admin" ON public.reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin handles" ON public.reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.groups (name, description, emoji, age_group) VALUES
 ('Schoolstress', 'Tips en steun rond toetsen en huiswerk', '📚', 'junior'),
 ('Creatief hoekje', 'Tekeningen, gedichten en ideeën delen', '🎨', 'junior'),
 ('Vriendschap', 'Over vrienden maken en houden', '🤝', 'junior'),
 ('Eerste baan', 'Bijbaantjes, sollicitaties en geld', '💼', 'senior'),
 ('Mentale gezondheid', 'Een veilige plek om te praten', '🌿', 'senior'),
 ('Schrijversclub', 'Verhalen schrijven en feedback geven', '✍️', 'senior');
INSERT INTO public.daily_quotes (quote_date, text, author) VALUES
 (current_date, 'Je verhaal is nog niet af. Elke dag schrijf je een nieuwe bladzijde.', 'CeritaProject'),
 (current_date + 1, 'Klein beginnen is ook beginnen.', 'Onbekend'),
 (current_date + 2, 'Je hoeft niet alles alleen te doen.', 'CeritaProject');
COMMIT;

-- ===== 0001_require_birthdate_for_groups =====
CREATE OR REPLACE FUNCTION public.my_age_group()
RETURNS public.age_group LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT age_group FROM public.profiles WHERE id = auth.uid() AND birthdate IS NOT NULL
$$;
COMMIT;

-- ===== 0002_create_can_use_community =====
CREATE OR REPLACE FUNCTION public.can_use_community()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.birthdate IS NOT NULL
      AND date_part('year', age(p.birthdate)) <= 25
  )
$function$;

-- Community (groepen, berichten, reacties) alleen voor leden tot 25 jaar; admins gezien uitzondering via has_role in can_access_group.
CREATE OR REPLACE FUNCTION public.can_access_group(_group uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT public.has_role(auth.uid(),'admin') OR (
    public.can_use_community() AND EXISTS (
      SELECT 1 FROM public.groups g WHERE g.id = _group AND NOT g.is_archived AND g.age_group = public.my_age_group())
  )
$function$;

DROP POLICY IF EXISTS "see own age groups" ON public.groups;
CREATE POLICY "see own age groups"
  ON public.groups
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (NOT is_archived AND age_group = public.my_age_group() AND public.can_use_community())
  );
COMMIT;

-- ===== 0003_add_adult_age_group =====
ALTER TYPE public.age_group ADD VALUE IF NOT EXISTS 'adult';
COMMIT;

-- ===== 0004_three_community_bands =====
CREATE OR REPLACE FUNCTION public.profiles_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE yrs int;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.birthdate IS DISTINCT FROM OLD.birthdate
     AND OLD.birthdate IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    NEW.birthdate := OLD.birthdate;
  END IF;
  IF NEW.birthdate IS NOT NULL THEN
    yrs := date_part('year', age(NEW.birthdate));
    NEW.age_group := CASE WHEN yrs <= 15 THEN 'junior'::public.age_group
                          WHEN yrs <= 25 THEN 'senior'::public.age_group
                          ELSE 'adult'::public.age_group END;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.age_group := OLD.age_group;
  END IF;
  RETURN NEW;
END $$;

-- Community: 12-15, 16-25 en 26-27 apart; vanaf 28 geen community meer (rest van de app wel).
CREATE OR REPLACE FUNCTION public.can_use_community()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $function$
  SELECT public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.birthdate IS NOT NULL
      AND date_part('year', age(p.birthdate)) BETWEEN 12 AND 27)
$function$;

UPDATE public.profiles SET age_group = CASE
  WHEN date_part('year', age(birthdate)) <= 15 THEN 'junior'::public.age_group
  WHEN date_part('year', age(birthdate)) <= 25 THEN 'senior'::public.age_group
  ELSE 'adult'::public.age_group END
WHERE birthdate IS NOT NULL;

INSERT INTO public.groups (name, description, emoji, age_group) VALUES
 ('Werk & studie', 'Over je carrière, afstuderen en de stap daarna', '🎓', 'adult'),
 ('Op jezelf wonen', 'Huren, budgetten en volwassen worden', '🏠', 'adult');
COMMIT;

-- ===== 0005_admin_activity_log =====
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
COMMIT;

-- ===== 0006_private_messages =====
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_a < user_b),
  UNIQUE (user_a, user_b)
);
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX direct_messages_conv_idx ON public.direct_messages (conversation_id, created_at);
CREATE TABLE public.blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);
GRANT SELECT, INSERT ON public.conversations TO authenticated;
GRANT SELECT, INSERT ON public.direct_messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.conversations, public.direct_messages, public.blocks TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.reports ADD COLUMN message_id uuid REFERENCES public.direct_messages(id) ON DELETE SET NULL;

-- Mag ik (nu) met deze persoon chatten? Zelfde leeftijdsgroep, beiden 12-27, niet geblokkeerd, ontvanger staat berichten toe.
CREATE OR REPLACE FUNCTION public.can_message(_other uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _other <> auth.uid()
    AND public.can_use_community()
    AND EXISTS (SELECT 1 FROM public.profiles me, public.profiles o
      WHERE me.id = auth.uid() AND o.id = _other
        AND me.birthdate IS NOT NULL AND o.birthdate IS NOT NULL
        AND date_part('year', age(o.birthdate)) BETWEEN 12 AND 27
        AND me.age_group = o.age_group
        AND o.allow_messages)
    AND NOT EXISTS (SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = _other)
         OR (b.blocker_id = _other AND b.blocked_id = auth.uid()))
$$;

CREATE OR REPLACE FUNCTION public.conv_other(_conv uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN user_a = auth.uid() THEN user_b WHEN user_b = auth.uid() THEN user_a END
  FROM public.conversations WHERE id = _conv
$$;

-- Gesprekken alleen zichtbaar zolang je 12-27 bent (28+: gesprekken vallen weg).
CREATE POLICY "see own conversations" ON public.conversations FOR SELECT TO authenticated
  USING ((auth.uid() IN (user_a, user_b)) AND public.can_use_community());
CREATE POLICY "start conversation" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_a AND public.can_message(user_b)) OR (auth.uid() = user_b AND public.can_message(user_a)));

CREATE POLICY "read messages" ON public.direct_messages FOR SELECT TO authenticated
  USING (public.conv_other(conversation_id) IS NOT NULL AND public.can_use_community());
CREATE POLICY "send messages" ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.can_message(public.conv_other(conversation_id)));

CREATE POLICY "own blocks" ON public.blocks FOR SELECT TO authenticated USING (blocker_id = auth.uid());
CREATE POLICY "block someone" ON public.blocks FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid() AND blocked_id <> auth.uid());
CREATE POLICY "unblock" ON public.blocks FOR DELETE TO authenticated USING (blocker_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bump_conversation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id; RETURN NEW; END $$;
CREATE TRIGGER bump_conversation AFTER INSERT ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.bump_conversation();

ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
COMMIT;

-- ===== 0007_daily_age_group_refresh =====
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE OR REPLACE FUNCTION public.refresh_age_groups()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET age_group = CASE
    WHEN date_part('year', age(birthdate)) <= 15 THEN 'junior'::public.age_group
    WHEN date_part('year', age(birthdate)) <= 25 THEN 'senior'::public.age_group
    ELSE 'adult'::public.age_group END
  WHERE birthdate IS NOT NULL AND age_group IS DISTINCT FROM CASE
    WHEN date_part('year', age(birthdate)) <= 15 THEN 'junior'::public.age_group
    WHEN date_part('year', age(birthdate)) <= 25 THEN 'senior'::public.age_group
    ELSE 'adult'::public.age_group END;
$$;
REVOKE EXECUTE ON FUNCTION public.refresh_age_groups() FROM PUBLIC, anon, authenticated;
SELECT cron.schedule('refresh-age-groups', '5 0 * * *', 'SELECT public.refresh_age_groups()');
COMMIT;

-- ===== 0008_allow_service_birthdate_fix =====
CREATE OR REPLACE FUNCTION public.profiles_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE yrs int;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.birthdate IS DISTINCT FROM OLD.birthdate
     AND OLD.birthdate IS NOT NULL AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(),'admin') THEN
    NEW.birthdate := OLD.birthdate;
  END IF;
  IF NEW.birthdate IS NOT NULL THEN
    yrs := date_part('year', age(NEW.birthdate));
    NEW.age_group := CASE WHEN yrs <= 15 THEN 'junior'::public.age_group
                          WHEN yrs <= 25 THEN 'senior'::public.age_group
                          ELSE 'adult'::public.age_group END;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.age_group := OLD.age_group;
  END IF;
  RETURN NEW;
END $function$;
COMMIT;

-- ===== 0009_message_requests =====
ALTER TABLE public.conversations ADD COLUMN status text NOT NULL DEFAULT 'pending';
UPDATE public.conversations SET status = 'accepted';
ALTER TABLE public.conversations ADD CONSTRAINT conversations_status_check CHECK (status IN ('pending','accepted','declined'));
CREATE POLICY "respond to request" ON public.conversations FOR UPDATE TO authenticated
  USING ((auth.uid() = user_a OR auth.uid() = user_b) AND status = 'pending')
  WITH CHECK (status IN ('accepted','declined'));
DROP POLICY "send messages" ON public.direct_messages;
CREATE POLICY "send messages" ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND can_message(conv_other(conversation_id))
    AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.status = 'accepted'));
COMMIT;

-- ===== 0010_conversation_requested_by =====
ALTER TABLE public.conversations ADD COLUMN requested_by uuid;
UPDATE public.conversations SET requested_by = user_a;
ALTER TABLE public.conversations ALTER COLUMN requested_by SET NOT NULL;
COMMIT;

-- ===== 0011_delete_declined_conversations =====
CREATE POLICY "delete pending conversation" ON public.conversations FOR DELETE TO authenticated
  USING ((auth.uid() = user_a OR auth.uid() = user_b) AND status <> 'accepted');
COMMIT;

-- ===== 0012_push_tokens =====
CREATE TABLE public.push_tokens (
  token text PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;
GRANT ALL ON public.push_tokens TO service_role;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tokens" ON public.push_tokens FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
COMMIT;

-- ===== 0013_articles =====
CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  emoji text NOT NULL DEFAULT '📖',
  category text NOT NULL DEFAULT 'verhaal',
  is_published boolean NOT NULL DEFAULT true,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read articles" ON public.articles FOR SELECT TO authenticated USING (is_published OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin write articles" ON public.articles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update articles" ON public.articles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete articles" ON public.articles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX articles_created_idx ON public.articles (created_at DESC);

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
  ELSIF TG_TABLE_NAME = 'articles' THEN
    act := 'article_' || lower(TG_OP);
    r := jsonb_build_object('title', r->>'title', 'category', r->>'category', 'is_published', r->'is_published');
  ELSE
    act := 'quote_' || lower(TG_OP);
    r := jsonb_build_object('text', r->>'text', 'quote_date', r->>'quote_date');
  END IF;
  INSERT INTO public.activity_log (actor_id, action, target_table, target_id, details)
  VALUES (auth.uid(), act, TG_TABLE_NAME, (CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END), r);
  RETURN NULL;
END $$;

CREATE TRIGGER log_articles AFTER INSERT OR UPDATE OR DELETE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.log_admin_activity();

-- Verzonnen voorbeeldverhalen (testdata)
INSERT INTO public.articles (title, body, emoji, category) VALUES
('De dag dat ik voor het eerst alleen op school kwam', 'Mijn eerste dag op de nieuwe school was een maand nadat ik was verhuisd. Ik kende niemand en wist niet eens waar het toilet was.\n\nIk had van tevoren afgesproken met mijn moeder dat ik gewoon iemand achterna liep. Dat klinkt makkelijk, maar mijn handen werden heel nat van dentroen.\n\nUiteindelijk vroeg ik aan een meisje in de gang of ze naar de aula ging. Ze zei ja en ik liep mee. Op een given moment zat ik aan tafel met vier mensen die net zo nieuw en zenuwachtig waren als ik.\n\nWat ik geleerd heb: je hoeft niet meteen vrienden te zijn. Het is genoeg om één persoon te vinden die de weg weet.', '🌱', 'verhaal'),
('Een avond zonder telefoon', 'We probeerden het met z''n drieen: een avond zonder telefoon. De eerste twintig minuten wist niemand wat hij moest doen met zijn handen.\n\nToen begonnen we kaarten. Daarna haalden we oude foto''s boven. Ergens halverwege de avond lachte iemand zo hard dat hij van zijn stoel viel.\n\nMijn telefoon stond de hele tijd in de keuken. Ik merkte dat ik minder vaak ging kijken dan ik dacht. Niet elke avond is leuk, maar deze avond bleef in mijn hoofd.\n\nTip: leg je telefoon bij iemand anders in de kamer. Dan is het geen wilskracht, maar gewoon ver weg.', '📵', 'tips'),
('Hoe begin je een gesprek met iemand die je niet kent?', 'Het moeilijkste stukje is de eerste zin. Die hoeft helemaal niets bijzonders te zijn.\n\nJe kunt iets vragen over wat je allebei zien: het eten vandaag, de drukte, een affiche aan de muur. Iets wat je allebei aangaat maakt het makkelijker dan "hallo, ik ben ..." .\n\nAls iemand kort antwoordt, is dat niet per se leuk. Soms is iemand moe, zenuwachtig of gewoon stil. Probeer het later nog een keer.\n\nEn als het niet lukt: dat zegt niets over jou. Het zegt alleen dat deze keer niet werkte.', '💬', 'tips'),
('Verhuizen: wat niemand je vertelt', 'Iedereen zegt dat verhuizen spannend is. Niemand zegt dat het vooral verdrietig is. Je laat je straat achter, je fietsenrek, de bakker die je naam kende.\n\nIn het nieuwe huis duurde het bij mij een half jaar voor ik me thuis voelde. Dat is geen falen. Het duurt gewoon zolang het duurt.\n\nWat wel hielp: één ding uit mijn oude kamer meteen op dezelfde plek zetten. Mijn plank boven het bed. Zo voelde de kamer niet als een hotel.\n\nAls je gaat verhuizen: geef jezelf tijd. En houd vast aan de dingen die je meeneemt, ook al zijn ze klein.', '🏠', 'verhaal');
COMMIT;

-- ===== 0014_fix_article_newlines =====
UPDATE public.articles SET body = replace(body, '\n\n', E'\n\n');
UPDATE public.articles SET body = replace(body, '\n', E'\n');
UPDATE public.articles SET body = replace(body, '\n\n', E'\n\n');
COMMIT;

-- ===== 0015_admin_read_conversations =====
CREATE POLICY "admins see conversations" ON public.conversations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
COMMIT;

-- ===== 0016_article_images =====
ALTER TABLE public.articles ADD COLUMN image_url text;

CREATE POLICY "leden lezen artikelfotos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'article-images');
CREATE POLICY "admins uploaden artikelfotos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'article-images' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins verwijderen artikelfotos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'article-images' AND public.has_role(auth.uid(), 'admin'::app_role));
COMMIT;

-- ===== 0017_daily_challenges_diary =====
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
COMMIT;

-- ===== 0018_virtual_pet =====
CREATE TABLE public.pets (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 30),
  species text NOT NULL DEFAULT 'kat',
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.pets TO authenticated;
GRANT ALL ON public.pets TO service_role;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pet read" ON public.pets FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own pet create" ON public.pets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND xp = 0);
CREATE POLICY "own pet rename" ON public.pets FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.pet_care (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  care_date date NOT NULL DEFAULT current_date,
  action text NOT NULL CHECK (action IN ('eten','spelen','knuffel')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, care_date, action)
);
GRANT SELECT, INSERT ON public.pet_care TO authenticated;
GRANT ALL ON public.pet_care TO service_role;
ALTER TABLE public.pet_care ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own care read" ON public.pet_care FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own care add" ON public.pet_care FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND care_date = current_date);

CREATE OR REPLACE FUNCTION public.pet_care_xp() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.pets SET xp = xp + 10 WHERE user_id = NEW.user_id;
  RETURN NEW;
END $$;
CREATE TRIGGER pet_care_xp AFTER INSERT ON public.pet_care FOR EACH ROW EXECUTE FUNCTION public.pet_care_xp();

CREATE OR REPLACE FUNCTION public.pets_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_user = 'authenticated' AND NEW.xp <> OLD.xp AND pg_trigger_depth() = 1 THEN
    NEW.xp := OLD.xp;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER pets_guard BEFORE UPDATE ON public.pets FOR EACH ROW EXECUTE FUNCTION public.pets_guard();
COMMIT;

-- ===== 0019_pet_todos =====
CREATE TABLE public.pet_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  todo_date date NOT NULL DEFAULT current_date,
  done boolean NOT NULL DEFAULT false,
  rewarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_todos TO authenticated;
GRANT ALL ON public.pet_todos TO service_role;
ALTER TABLE public.pet_todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own todos" ON public.pet_todos FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.pet_todo_xp() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN NEW.rewarded := false; NEW.done := false; RETURN NEW; END IF;
  NEW.rewarded := OLD.rewarded;
  IF NEW.done AND NOT OLD.rewarded THEN
    NEW.rewarded := true;
    UPDATE public.pets SET xp = xp + 5 WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER pet_todo_xp BEFORE INSERT OR UPDATE ON public.pet_todos FOR EACH ROW EXECUTE FUNCTION public.pet_todo_xp();
COMMIT;

-- ===== 0020_pet_customization =====
ALTER TABLE public.pets ADD COLUMN background text NOT NULL DEFAULT 'kamer', ADD COLUMN outfit text NOT NULL DEFAULT 'geen', ADD COLUMN house text NOT NULL DEFAULT 'geen';
COMMIT;

-- ===== 0021_calls_permission =====
ALTER TABLE public.profiles ADD COLUMN allow_calls boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.can_call(_conv uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.profiles a ON a.id = c.user_a
    JOIN public.profiles b ON b.id = c.user_b
    WHERE c.id = _conv AND c.status = 'accepted'
      AND auth.uid() IN (c.user_a, c.user_b)
      AND a.allow_calls AND b.allow_calls
      AND public.can_message(CASE WHEN c.user_a = auth.uid() THEN c.user_b ELSE c.user_a END))
$$;
GRANT EXECUTE ON FUNCTION public.can_call(uuid) TO authenticated;
COMMIT;

-- ===== 0022_pet_collection_lists =====
CREATE TABLE public.companions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  species text NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 30),
  outfit text NOT NULL DEFAULT 'geen',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.companions TO authenticated;
GRANT ALL ON public.companions TO service_role;
ALTER TABLE public.companions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own companions read" ON public.companions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own companions add" ON public.companions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own companions edit" ON public.companions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Extra pet slot every 2 levels: level 3 -> 1 extra, level 5 -> 2, ...
CREATE OR REPLACE FUNCTION public.companions_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lvl int; have int;
BEGIN
  SELECT floor(xp / 50) + 1 INTO lvl FROM public.pets WHERE user_id = NEW.user_id;
  SELECT count(*) INTO have FROM public.companions WHERE user_id = NEW.user_id;
  IF lvl IS NULL OR have >= floor((lvl - 1) / 2) THEN
    RAISE EXCEPTION 'Nog geen nieuw diertje vrijgespeeld';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER companions_limit BEFORE INSERT ON public.companions FOR EACH ROW EXECUTE FUNCTION public.companions_limit();

CREATE TABLE public.pet_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pet_ref text NOT NULL DEFAULT 'main',
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 40),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_lists TO authenticated;
GRANT ALL ON public.pet_lists TO service_role;
ALTER TABLE public.pet_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lists" ON public.pet_lists FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.pet_todos ADD COLUMN list_id uuid REFERENCES public.pet_lists(id) ON DELETE CASCADE;
COMMIT;

-- ===== 0023_usernames =====
ALTER TABLE public.profiles ADD COLUMN username text CHECK (username ~ '^[a-z0-9_.]{3,20}$');
CREATE UNIQUE INDEX profiles_username_unique ON public.profiles (lower(username));
COMMIT;

-- ===== 0024_profile_avatars =====
ALTER TABLE public.profiles ADD COLUMN avatar_url text;

CREATE POLICY "members read avatars" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');
CREATE POLICY "own avatar upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own avatar update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own avatar delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
COMMIT;

-- ===== 0025_mute_archive_prefs =====
CREATE TABLE public.conversation_prefs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  muted boolean not null default false,
  archived boolean not null default false,
  primary key (user_id, conversation_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_prefs TO authenticated;
GRANT ALL ON public.conversation_prefs TO service_role;
ALTER TABLE public.conversation_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conversation prefs" ON public.conversation_prefs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.group_prefs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  muted boolean not null default false,
  archived boolean not null default false,
  primary key (user_id, group_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_prefs TO authenticated;
GRANT ALL ON public.group_prefs TO service_role;
ALTER TABLE public.group_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own group prefs" ON public.group_prefs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
COMMIT;

-- ===== 0026_birthday_bonus =====
CREATE TABLE public.birthday_claims (
  user_id uuid not null references public.profiles(id) on delete cascade,
  claim_year integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, claim_year)
);
GRANT SELECT, INSERT ON public.birthday_claims TO authenticated;
GRANT ALL ON public.birthday_claims TO service_role;
ALTER TABLE public.birthday_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own birthday claims" ON public.birthday_claims
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Verjaardagscadeau: +25 XP, een keer per jaar, alleen op de verjaardag zelf.
CREATE OR REPLACE FUNCTION public.claim_birthday_bonus()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bd date;
  yr integer := extract(year from now())::int;
BEGIN
  SELECT birthdate INTO bd FROM public.profiles WHERE id = auth.uid();
  IF bd IS NULL THEN RETURN 0; END IF;
  IF extract(month from bd) <> extract(month from now())
     OR extract(day from bd) <> extract(day from now()) THEN
    RETURN 0;
  END IF;
  INSERT INTO public.birthday_claims (user_id, claim_year)
  VALUES (auth.uid(), yr)
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN 0; END IF;
  UPDATE public.pets SET xp = xp + 25 WHERE user_id = auth.uid();
  RETURN 25;
END;
$$;
COMMIT;

-- ===== 0027_post_replies =====
ALTER TABLE public.posts ADD COLUMN reply_to uuid REFERENCES public.posts(id) ON DELETE SET NULL;
COMMIT;

-- ===== 0028_shop_orders =====
CREATE TABLE public.shop_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product text NOT NULL DEFAULT 'game_clicks',
  kind text NOT NULL CHECK (kind IN ('paid','gift','free')),
  amount_cents integer NOT NULL DEFAULT 0,
  stripe_session_id text UNIQUE,
  ship_name text NOT NULL,
  ship_street text NOT NULL,
  ship_postcode text NOT NULL,
  ship_city text NOT NULL,
  status text NOT NULL DEFAULT 'nieuw' CHECK (status IN ('nieuw','verzonden')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.shop_orders TO authenticated;
GRANT ALL ON public.shop_orders TO service_role;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own orders" ON public.shop_orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update orders" ON public.shop_orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.free_items_available() RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT GREATEST(0, (SELECT count(*) FROM shop_orders WHERE kind='gift') - (SELECT count(*) FROM shop_orders WHERE kind='free'))::int;
$$;
GRANT EXECUTE ON FUNCTION public.free_items_available() TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_free_item(_name text, _street text, _postcode text, _city text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  PERFORM pg_advisory_xact_lock(424242);
  IF EXISTS (SELECT 1 FROM shop_orders WHERE user_id = auth.uid() AND kind='free') THEN
    RAISE EXCEPTION 'Je hebt al een gratis exemplaar besteld';
  END IF;
  IF free_items_available() < 1 THEN RAISE EXCEPTION 'Er staan nu geen gratis exemplaren klaar'; END IF;
  IF length(trim(_name))=0 OR length(trim(_street))=0 OR length(trim(_postcode))=0 OR length(trim(_city))=0 THEN
    RAISE EXCEPTION 'Vul je adres helemaal in';
  END IF;
  INSERT INTO shop_orders(user_id, kind, ship_name, ship_street, ship_postcode, ship_city)
  VALUES (auth.uid(), 'free', _name, _street, _postcode, _city) RETURNING id INTO new_id;
  RETURN new_id;
END $$;
GRANT EXECUTE ON FUNCTION public.claim_free_item(text,text,text,text) TO authenticated;
COMMIT;

-- ===== 0029_shop_points_weekly_push =====
ALTER TABLE public.shop_orders ADD COLUMN points integer NOT NULL DEFAULT 0;
ALTER TABLE public.shop_orders ADD COLUMN tier text;
CREATE TABLE public.cron_tokens (name text PRIMARY KEY, token text NOT NULL DEFAULT encode(gen_random_bytes(24),'hex'));
GRANT ALL ON public.cron_tokens TO service_role;
ALTER TABLE public.cron_tokens ENABLE ROW LEVEL SECURITY;
INSERT INTO public.cron_tokens(name) VALUES ('free_items_weekly');
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('free-items-weekly', '0 16 * * 1', $$
  SELECT net.http_post(
    url := 'https://project--74b0fbcb-8a92-4328-b6bf-974e228fdbb6.lovable.app/api/public/free-items-weekly',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(SELECT token FROM public.cron_tokens WHERE name='free_items_weekly')),
    body := '{}'::jsonb)
  WHERE public.free_items_available() > 0;
$$);
COMMIT;

-- ===== 0030_order_tracking_code =====
ALTER TABLE public.shop_orders ADD COLUMN tracking_code text;
COMMIT;

-- ===== 0031_story_submissions =====
CREATE TABLE public.story_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  body text NOT NULL CHECK (char_length(body) BETWEEN 20 AND 20000),
  category text NOT NULL DEFAULT 'inspiratie',
  status text NOT NULL DEFAULT 'nieuw' CHECK (status IN ('nieuw','in_behandeling','geplaatst','afgewezen')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.story_submissions TO authenticated;
GRANT ALL ON public.story_submissions TO service_role;
ALTER TABLE public.story_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leden sturen eigen verhaal in" ON public.story_submissions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "leden zien eigen inzendingen" ON public.story_submissions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins werken status bij" ON public.story_submissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
COMMIT;

-- ===== 0032_shop_products =====
CREATE TABLE public.shop_products (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  emoji text NOT NULL DEFAULT '🛍️',
  category text NOT NULL DEFAULT 'fidgets' CHECK (category IN ('fidgets','journals','kleding')),
  kind text NOT NULL DEFAULT 'fysiek' CHECK (kind IN ('fysiek','digitaal')),
  cost_cents integer NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
  profit_cents integer NOT NULL DEFAULT 100 CHECK (profit_cents >= 0),
  is_active boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_products TO authenticated;
GRANT ALL ON public.shop_products TO service_role;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leden zien actieve producten" ON public.shop_products FOR SELECT TO authenticated USING (is_active OR public.has_role(auth.uid(),'admin'));

ALTER TABLE public.shop_orders ADD COLUMN product_id text;

INSERT INTO public.shop_products (id, name, description, emoji, category, kind, cost_cents, profit_cents, sort) VALUES
  ('game_clicks', 'Game Clicks', 'Klik-sleutelhanger met vier gameknopjes. Lekker friemelen op school, in de bus of als je even onrustig bent. Wordt opgestuurd met DHL.', '🎮', 'fidgets', 'fysiek', 260, 100, 1),
  ('journal_rust', 'Rust-journal (printbaar)', 'VOORBEELD — Printbare journal met dagelijkse vragen om rust in je hoofd te krijgen. Je ontvangt een pdf om zelf te printen.', '📓', 'journals', 'digitaal', 0, 100, 2),
  ('journal_dromen', 'Dromen-journal (printbaar)', 'VOORBEELD — Printbare journal om je doelen en dromen bij te houden, met weekoverzichten. Je ontvangt een pdf om zelf te printen.', '✨', 'journals', 'digitaal', 0, 100, 3);
COMMIT;

-- ===== 0033_digital_downloads =====
CREATE POLICY "admins manage digital products" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'digital-products' AND public.has_role(auth.uid(),'admin'))
WITH CHECK (bucket_id = 'digital-products' AND public.has_role(auth.uid(),'admin'));
UPDATE public.shop_products SET description = 'Printbare journal met 14 dagpagina''s vol vragen om rust in je hoofd te krijgen. Na betaling download je meteen de pdf.' WHERE id = 'journal_rust';
UPDATE public.shop_products SET description = 'Printbare journal voor je dromen en doelen, met 8 weekpagina''s. Na betaling download je meteen de pdf.' WHERE id = 'journal_dromen';
COMMIT;

-- ===== 0034_group_chat_admin_members =====
CREATE POLICY "admin invite members" ON public.group_members FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin')
  AND EXISTS (
    SELECT 1 FROM public.groups g JOIN public.profiles p ON p.id = group_members.user_id
    WHERE g.id = group_members.group_id AND g.age_group = p.age_group AND NOT g.is_archived
  )
);
CREATE POLICY "admin see members" ON public.group_members FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
COMMIT;

-- ===== 0035_new_members_findable_by_default =====
ALTER TABLE public.profiles ALTER COLUMN allow_messages SET DEFAULT true;
COMMIT;

-- ===== 0036_group_invites_member_invites =====
create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now()
);

-- Maximaal één openstaande uitnodiging per persoon per groep.
create unique index group_invites_one_pending
  on public.group_invites (group_id, invitee_id)
  where status = 'pending';

grant select, insert, delete on public.group_invites to authenticated;
grant all on public.group_invites to service_role;

alter table public.group_invites enable row level security;

-- Zelf ingestuurde, zelf ontvangen, en beheerders zien alles.
create policy "see own group invites"
  on public.group_invites for select to authenticated
  using (invitee_id = auth.uid() or inviter_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Alleden die zelf lid zijn van de groep mogen iemand uitnodigen;
-- de genodigde moet in dezelfde leeftijdsgroep als de groep zitten.
create policy "group members can invite same band"
  on public.group_invites for insert to authenticated
  with check (
    inviter_id = auth.uid()
    and public.is_member(group_id)
    and invitee_id <> auth.uid()
    and exists (
      select 1
      from public.groups g
      join public.profiles p on p.id = invitee_id
      where g.id = group_id
        and g.age_group = p.age_group
    )
  );

-- Degene die uitnodigde kan een nog openstaande uitnodiging intrekken.
create policy "inviter can cancel pending invite"
  on public.group_invites for delete to authenticated
  using (inviter_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- De genodigde accepteert of weigert via deze beveiligde functie;
-- bij accepteren wordt het lid meteen toegevoegd aan de groep.
create or replace function public.respond_group_invite(p_invite uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.group_invites%rowtype;
begin
  select * into inv from public.group_invites where id = p_invite;
  if not found or inv.invitee_id <> auth.uid() or inv.status <> 'pending' then
    return 'not_allowed';
  end if;
  update public.group_invites
    set status = case when p_accept then 'accepted' else 'declined' end
    where id = p_invite;
  if p_accept then
    insert into public.group_members (group_id, user_id)
    values (inv.group_id, inv.invitee_id)
    on conflict do nothing;
  end if;
  return 'ok';
end $$;

grant execute on function public.respond_group_invite(uuid, boolean) to authenticated;
COMMIT;

-- ===== 0037_add_owner_role =====
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';
COMMIT;

-- ===== 0038_owner_orders_and_moderation =====
-- Alleen de eigenaar (rol 'owner') ziet en beheert shop-bestellingen.
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'owner'::app_role
  )
$$;

DROP POLICY "own orders" ON public.shop_orders;
CREATE POLICY "own orders" ON public.shop_orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_owner(auth.uid()));

DROP POLICY "admins update orders" ON public.shop_orders;
CREATE POLICY "owner updates orders" ON public.shop_orders
  FOR UPDATE TO authenticated
  USING (public.is_owner(auth.uid()));

-- Beheerders kunnen leden waarschuwen.
CREATE TABLE public.member_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id),
  admin_id uuid NOT NULL REFERENCES public.profiles(id),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.member_warnings TO authenticated;
GRANT ALL ON public.member_warnings TO service_role;
ALTER TABLE public.member_warnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins warn members" ON public.member_warnings
  FOR INSERT TO authenticated
  WITH CHECK (admin_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "read warnings" ON public.member_warnings
  FOR SELECT TO authenticated
  USING (member_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- Beheerders kunnen leden een time-out geven (tijdelijk niet posten in groepen).
CREATE TABLE public.member_timeouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.profiles(id),
  admin_id uuid NOT NULL REFERENCES public.profiles(id),
  until timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.member_timeouts TO authenticated;
GRANT ALL ON public.member_timeouts TO service_role;
ALTER TABLE public.member_timeouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins give timeouts" ON public.member_timeouts
  FOR INSERT TO authenticated
  WITH CHECK (admin_id = auth.uid() AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins end timeouts" ON public.member_timeouts
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "read timeouts" ON public.member_timeouts
  FOR SELECT TO authenticated
  USING (member_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.is_timed_out(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_timeouts
    WHERE member_id = _user_id AND until > now()
  )
$$;

-- Tijdens een time-out kan een lid niet in groepen posten.
DROP POLICY "write posts" ON public.posts;
CREATE POLICY "write posts" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND is_member(group_id)
    AND can_access_group(group_id)
    AND (NOT is_hidden)
    AND (NOT public.is_timed_out(auth.uid()))
  );
COMMIT;

-- ===== 0039_admin_ids =====
create or replace function public.admin_ids() returns setof uuid language sql stable security definer set search_path = public as $$ select distinct user_id from public.user_roles where role in ('admin','owner') $$;
revoke all on function public.admin_ids() from public, anon;
grant execute on function public.admin_ids() to authenticated;
COMMIT;

-- ===== 0040_unread_chat_counters =====
-- Ongelezen-aantallen voor privé-chats en groepenschats
ALTER TABLE public.conversation_prefs ADD COLUMN IF NOT EXISTS last_read_at timestamptz;

CREATE TABLE public.group_reads (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, group_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_reads TO authenticated;
GRANT ALL ON public.group_reads TO service_role;
ALTER TABLE public.group_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY group_reads_self ON public.group_reads FOR ALL
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Ongelezen berichten per privégesprek van de aanroeper
CREATE OR REPLACE FUNCTION public.my_dm_unread()
RETURNS TABLE (conversation_id uuid, unread integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id,
    (SELECT count(*)::int FROM public.direct_messages m
       WHERE m.conversation_id = c.id
         AND m.sender_id <> auth.uid()
         AND m.created_at > COALESCE(p.last_read_at, c.created_at)) AS unread
  FROM public.conversations c
  LEFT JOIN public.conversation_prefs p
    ON p.conversation_id = c.id AND p.user_id = auth.uid()
  WHERE (c.user_a = auth.uid() OR c.user_b = auth.uid())
    AND c.status = 'accepted'
$$;

-- Ongelezen berichten per groep waar de aanroeper lid van is
CREATE OR REPLACE FUNCTION public.my_group_unread()
RETURNS TABLE (group_id uuid, unread integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT gm.group_id,
    (SELECT count(*)::int FROM public.posts po
       WHERE po.group_id = gm.group_id
         AND po.is_hidden = false
         AND po.author_id <> auth.uid()
         AND po.created_at > COALESCE(gr.last_read_at, gm.joined_at)) AS unread
  FROM public.group_members gm
  LEFT JOIN public.group_reads gr
    ON gr.group_id = gm.group_id AND gr.user_id = auth.uid()
  WHERE gm.user_id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.my_dm_unread() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_group_unread() TO authenticated;
COMMIT;

-- ===== 0041_post_mentions =====
ALTER TABLE public.posts ADD COLUMN mentions uuid[] NOT NULL DEFAULT '{}';
COMMENT ON COLUMN public.posts.mentions IS 'User ids mentioned with @username in the post body.';
COMMIT;

-- ===== 0042_dm_other_read_at =====
CREATE OR REPLACE FUNCTION public.dm_other_read_at(_conv uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.last_read_at
  FROM public.conversations c
  JOIN public.conversation_prefs p
    ON p.conversation_id = c.id
   AND p.user_id = CASE WHEN c.user_a = auth.uid() THEN c.user_b ELSE c.user_a END
  WHERE c.id = _conv
    AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.dm_other_read_at(uuid) TO authenticated;
COMMIT;

-- ===== 0043_report_responses =====
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
COMMIT;

-- ===== 0044_chat_voice_memos =====
ALTER TABLE public.direct_messages ADD COLUMN audio_path text;
ALTER TABLE public.posts ADD COLUMN audio_path text;
CREATE OR REPLACE FUNCTION public.validate_chat_audio() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE expected text;
BEGIN
IF TG_TABLE_NAME='direct_messages' THEN expected:=NEW.sender_id::text||'/dm/'||NEW.conversation_id::text||'/'; ELSE expected:=NEW.author_id::text||'/group/'||NEW.group_id::text||'/'; END IF;
IF NEW.audio_path IS NOT NULL AND (left(NEW.audio_path,length(expected))<>expected OR NEW.audio_path LIKE '%..%' OR NEW.audio_path NOT LIKE '%.wav') THEN RAISE EXCEPTION 'Ongeldige spraakmemo'; END IF;
RETURN NEW;
END $$;
CREATE TRIGGER validate_dm_audio BEFORE INSERT OR UPDATE ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.validate_chat_audio();
CREATE TRIGGER validate_group_audio BEFORE INSERT OR UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.validate_chat_audio();
CREATE POLICY "upload own chat audio" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='chat-audio' AND (storage.foldername(name))[1]=auth.uid()::text AND (((storage.foldername(name))[2]='dm' AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id::text=(storage.foldername(name))[3] AND auth.uid() IN(c.user_a,c.user_b) AND c.status='accepted' AND public.can_message(public.conv_other(c.id)))) OR ((storage.foldername(name))[2]='group' AND EXISTS(SELECT 1 FROM public.groups g WHERE g.id::text=(storage.foldername(name))[3] AND public.is_member(g.id) AND public.can_access_group(g.id) AND NOT public.is_timed_out(auth.uid())))));
CREATE POLICY "read accessible chat audio" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='chat-audio' AND ((storage.foldername(name))[1]=auth.uid()::text OR EXISTS(SELECT 1 FROM public.direct_messages m WHERE m.audio_path=name) OR EXISTS(SELECT 1 FROM public.posts p WHERE p.audio_path=name AND NOT p.is_hidden)));
CREATE POLICY "remove own chat audio" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='chat-audio' AND (storage.foldername(name))[1]=auth.uid()::text);
COMMIT;

-- ===== 0045_qualify_chat_audio_upload_path =====
ALTER POLICY "upload own chat audio" ON storage.objects WITH CHECK (bucket_id='chat-audio' AND (storage.foldername(objects.name))[1]=auth.uid()::text AND (((storage.foldername(objects.name))[2]='dm' AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id::text=(storage.foldername(objects.name))[3] AND auth.uid() IN(c.user_a,c.user_b) AND c.status='accepted' AND public.can_message(public.conv_other(c.id)))) OR ((storage.foldername(objects.name))[2]='group' AND EXISTS(SELECT 1 FROM public.groups g WHERE g.id::text=(storage.foldername(objects.name))[3] AND public.is_member(g.id) AND public.can_access_group(g.id) AND NOT public.is_timed_out(auth.uid())))));
COMMIT;

-- ===== 0046_free_items_weekly_own_url =====
-- The weekly push job pointed at the old Lovable-hosted URL. Stop it and let the
-- owner schedule it again for their own site:  SELECT public.schedule_free_items_weekly('https://jouw-site.nl');
DO $$ BEGIN
  PERFORM cron.unschedule('free-items-weekly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.schedule_free_items_weekly(site_url text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  RETURN cron.schedule('free-items-weekly', '0 16 * * 1', format($job$
    SELECT net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(SELECT token FROM public.cron_tokens WHERE name='free_items_weekly')),
      body := '{}'::jsonb)
    WHERE public.free_items_available() > 0;
  $job$, rtrim(site_url, '/') || '/api/public/free-items-weekly'));
END
$fn$;

REVOKE ALL ON FUNCTION public.schedule_free_items_weekly(text) FROM PUBLIC, anon, authenticated;
COMMIT;

-- ===== 0047_storage_buckets_diary_audio =====
-- Things Lovable set up outside the migrations, so a fresh Supabase project has them too:
-- the private storage buckets, diary voice memos (column + storage policies).
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', false),
  ('article-images', 'article-images', false),
  ('diary-photos', 'diary-photos', false),
  ('diary-audio', 'diary-audio', false),
  ('chat-audio', 'chat-audio', false),
  ('digital-products', 'digital-products', false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.diary_entries ADD COLUMN IF NOT EXISTS audio_path text;

DROP POLICY IF EXISTS "own diary audio read" ON storage.objects;
DROP POLICY IF EXISTS "own diary audio write" ON storage.objects;
DROP POLICY IF EXISTS "own diary audio delete" ON storage.objects;
CREATE POLICY "own diary audio read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'diary-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own diary audio write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'diary-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own diary audio delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'diary-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
COMMIT;
