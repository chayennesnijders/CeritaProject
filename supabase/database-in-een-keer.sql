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

-- ===== 0048_account_deletion =====
-- Members can delete their own account (required by the App Store and Play Store).
-- Warnings/time-outs a member received go with them; the ones an admin gave stay, without the admin's name.
ALTER TABLE public.member_warnings DROP CONSTRAINT IF EXISTS member_warnings_member_id_fkey;
ALTER TABLE public.member_warnings ADD CONSTRAINT member_warnings_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.member_warnings ALTER COLUMN admin_id DROP NOT NULL;
ALTER TABLE public.member_warnings DROP CONSTRAINT IF EXISTS member_warnings_admin_id_fkey;
ALTER TABLE public.member_warnings ADD CONSTRAINT member_warnings_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.member_timeouts DROP CONSTRAINT IF EXISTS member_timeouts_member_id_fkey;
ALTER TABLE public.member_timeouts ADD CONSTRAINT member_timeouts_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.member_timeouts ALTER COLUMN admin_id DROP NOT NULL;
ALTER TABLE public.member_timeouts DROP CONSTRAINT IF EXISTS member_timeouts_admin_id_fkey;
ALTER TABLE public.member_timeouts ADD CONSTRAINT member_timeouts_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_responded_by_fkey;
ALTER TABLE public.reports ADD CONSTRAINT reports_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
COMMIT;

-- ===== 0049_rotating_daily_challenges =====
-- 365 daily diary challenges that rotate by themselves: the challenge for a day is picked
-- at 00:00 Dutch time from this pool (day 1 = 1 January 2026) and starts over after 365 days.
-- An admin can still set a challenge for a specific date; that one wins.
CREATE TABLE IF NOT EXISTS public.challenge_pool (
  day_no int PRIMARY KEY CHECK (day_no BETWEEN 1 AND 365),
  title text NOT NULL,
  description text
);
GRANT ALL ON public.challenge_pool TO service_role;
ALTER TABLE public.challenge_pool ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin challenge pool" ON public.challenge_pool;
CREATE POLICY "admin challenge pool" ON public.challenge_pool FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_pool TO authenticated;

INSERT INTO public.challenge_pool (day_no, title, description) VALUES
  (1, 'Schrijf 3 dingen op waar je vandaag blij mee bent', 'Het mag heel klein zijn, zoals een lekker ontbijt of een zonnetje.'),
  (2, 'Beschrijf jezelf in 5 woorden', 'Kies woorden die echt bij jou passen, niet wat anderen vinden.'),
  (3, 'Hoe heb je je beste vriend of vriendin leren kennen?', 'Schrijf het verhaal op van hoe jullie vrienden werden.'),
  (4, 'Teken je humeur van vandaag', 'Gebruik kleuren, vormen of een poppetje. Maak er een foto van voor je dagboek!'),
  (5, 'Wat wil je later worden?', 'Of wat wil je later in elk geval graag doen?'),
  (6, 'Hoe voel je je vandaag in één woord?', 'Leg daarna uit waarom je dat woord kiest.'),
  (7, 'Wat is je oudste herinnering?', 'Hoe oud was je en wat weet je er nog van?'),
  (8, 'Wat ga jij vandaag doen om goed voor jezelf te zorgen?', 'Kies één klein ding en doe het echt.'),
  (9, 'Ga naar buiten en zoek iets groens', 'Schrijf of teken wat je vond.'),
  (10, 'Geef vandaag iemand een compliment', 'Schrijf op wie het was en hoe die persoon reageerde.'),
  (11, 'Als je een superkracht mocht kiezen, welke wordt het?', 'Wat zou je ermee doen?'),
  (12, 'Wat heb je vandaag geleerd?', 'Op school, op je werk, online of van iemand anders.'),
  (13, 'Wat had je vandaag aan?', 'Waarom koos je deze kleren?'),
  (14, 'Wie wil je vandaag bedanken?', 'Schrijf op wie het is en waarom. Durf je het ook echt te zeggen?'),
  (15, 'Wat zou je vrienden over jou zeggen?', 'Schrijf op wat zij waarschijnlijk zouden zeggen. Klopt het?'),
  (16, 'Wat maakt iemand een goede vriend?', 'Noem de drie belangrijkste dingen.'),
  (17, 'Schrijf een gedichtje over de lucht', 'Het hoeft niet te rijmen. Kijk naar buiten voor inspiratie.'),
  (18, 'Waar wil je ooit nog naartoe reizen?', 'Wat wil je daar zien of doen?'),
  (19, 'Wat maakte je vandaag een beetje verdrietig?', 'Het is fijn om het op te schrijven. Wat kan je helpen?'),
  (20, 'Schrijf over je leukste verjaardag', 'Wat maakte die dag zo speciaal?'),
  (21, 'Drink een glas water en schrijf hoe je je voelt', 'Even pauze nemen is ook belangrijk!'),
  (22, 'Welk dier zag je vandaag?', 'Een vogel, een kat, een spin? Wat deed het?'),
  (23, 'Doe iets aardigs zonder dat iemand het weet', 'Wat deed je en hoe voelde dat?'),
  (24, 'Wat zou je doen als je een dag onzichtbaar was?', 'Waar ga je heen?'),
  (25, 'Wat vind je moeilijk, maar wil je toch leren?', 'Wat is een eerste kleine stap?'),
  (26, 'Wat at je vandaag als ontbijt?', 'Was het lekker? Wat is je droomontbijt?'),
  (27, 'Wat is je lievelingsplekje in huis?', 'Beschrijf hoe het eruitziet en waarom je je daar fijn voelt.'),
  (28, 'Waar word je superenthousiast van?', 'Waar zou je uren over kunnen praten?'),
  (29, 'Wie zou je graag beter willen leren kennen?', 'Wat zou je die persoon willen vragen?'),
  (30, 'Bedenk een nieuw ijsjessmaak', 'Hoe heet hij, hoe smaakt hij en hoe ziet hij eruit?'),
  (31, 'Schrijf een brief aan jezelf over 5 jaar', 'Wat hoop je dat er dan is veranderd?'),
  (32, 'Wanneer voel je je het meest rustig?', 'Waar ben je dan en wat doe je?'),
  (33, 'Wat was je lievelingsspeelgoed vroeger?', 'Heb je het nog?'),
  (34, 'Wat is jouw favoriete manier om te ontspannen?', 'Een bad, een boek, een wandeling?'),
  (35, 'Kijk naar de wolken', 'Welke vormen zie je erin?'),
  (36, 'Help iemand thuis met een klusje', 'Wat deed je?'),
  (37, 'Als je een tijdmachine had, waar ga je dan heen?', 'Vroeger of de toekomst?'),
  (38, 'Schrijf over een keer dat je niet opgaf', 'Wat hielp je om door te gaan?'),
  (39, 'Beschrijf je weg naar school of werk', 'Wat kom je allemaal tegen?'),
  (40, 'Welk liedje maakt je altijd vrolijk?', 'Schrijf op welk liedje het is en wat je erbij voelt.'),
  (41, 'Wat is jouw grootste kracht?', 'Waar kun je op bouwen als het even moeilijk gaat?'),
  (42, 'Schrijf over een leuke dag met vrienden', 'Wat deden jullie en waarom was het zo leuk?'),
  (43, 'Schrijf het begin van een sprookje', 'Begin met: Er was eens…'),
  (44, 'Wat staat er op jouw bucketlist?', 'Schrijf minstens vijf dingen op die je ooit wilt doen.'),
  (45, 'Schrijf over een moment dat je je dapper voelde', 'Wat deed je en hoe voelde het daarna?'),
  (46, 'Schrijf over een vakantie die je nooit vergeet', 'Wat gebeurde er en met wie was je?'),
  (47, 'Maak een lijstje met dingen die je opvrolijken', 'Kijk ernaar als je een sombere dag hebt.'),
  (48, 'Wat is je lievelingsboom of -bloem?', 'Waarom vind je die zo mooi?'),
  (49, 'Stuur iemand een lief berichtje', 'Wie koos je en waarom?'),
  (50, 'Welk eten zou je voor altijd willen eten?', 'En welk eten nooit meer?'),
  (51, 'Welk vak of onderwerp vind je het leukst?', 'Waarom?'),
  (52, 'Wat is het eerste wat je deed toen je wakker werd?', 'En wat het laatste voor je ging slapen gisteren?'),
  (53, 'Waar ben je dankbaar voor aan je lichaam?', 'Je benen die je overal brengen, je ogen die alles zien… Wat kies jij?'),
  (54, 'Ben je een ochtendmens of een avondmens?', 'Wanneer voel jij je het fijnst, en waarom denk je dat is?'),
  (55, 'Wat doe jij als een vriend verdrietig is?', 'Wat helpt jou zelf als je verdrietig bent?'),
  (56, 'Maak een foto van iets kleins dat mooi is', 'Een blaadje, een knoop, een druppel… Voeg de foto toe aan je dagboek.'),
  (57, 'Wat wil je dit jaar nog leren?', 'Een taal, een instrument, een sport?'),
  (58, 'Welk gevoel had je het meest deze week?', 'Blij, moe, boos, zenuwachtig? Wat zorgde ervoor?'),
  (59, 'Wat was je eerste schooldag?', 'Wat weet je er nog van?'),
  (60, 'Hoe heb je vannacht geslapen?', 'Wat helpt jou om lekker te slapen?'),
  (61, 'Schrijf over de geluiden buiten', 'Doe je ogen dicht en luister even.'),
  (62, 'Wie kan wel een opkikkertje gebruiken?', 'Wat kun je voor die persoon doen?'),
  (63, 'Wat als je huisdier kon praten?', 'Wat zou het als eerste zeggen?'),
  (64, 'Wat is iets wat je jezelf hebt aangeleerd?', 'Hoe heb je dat gedaan?'),
  (65, 'Welke app gebruik je het meest?', 'Waarom?'),
  (66, 'Welk eten maakt jou blij?', 'Beschrijf je lievelingseten alsof je het aan iemand uitlegt die het nog nooit geproefd heeft.'),
  (67, 'Wat maakt jou uniek?', 'Iets wat niemand anders precies zo heeft als jij.'),
  (68, 'Wie is jouw voorbeeld?', 'Iemand die je kent of iemand die beroemd is. Wat vind je zo goed aan die persoon?'),
  (69, 'Ontwerp je droomkamer', 'Beschrijf of teken alles: de muren, je bed, de lampjes.'),
  (70, 'Hoe ziet jouw droomhuis eruit?', 'Staat het in de stad, in het bos of aan zee?'),
  (71, 'Wat doe je als je je eenzaam voelt?', 'Wie kun je dan een berichtje sturen?'),
  (72, 'Welk liedje doet je denken aan vroeger?', 'Welke herinnering hoort erbij?'),
  (73, 'Doe 5 minuten niks en schrijf wat je merkte', 'Gewoon zitten en ademen. Wat hoorde of voelde je?'),
  (74, 'Hoe ziet de lucht er vandaag uit?', 'Welke kleuren zie je?'),
  (75, 'Wat kun jij delen met anderen?', 'Je tijd, een glimlach, je spullen?'),
  (76, 'Je mag een nieuwe planeet bedenken', 'Hoe heet hij en wie wonen er?'),
  (77, 'Welke tip zou je aan je jongere zelf geven?', 'Wat weet je nu dat je toen nog niet wist?'),
  (78, 'Wat ligt er op je bureau of nachtkastje?', 'Wat zegt dat over jou?'),
  (79, 'Wat ging er vandaag goed?', 'Ook op een moeilijke dag gaat er vaak iets kleins goed. Zoek het maar!'),
  (80, 'Welke kleur past het best bij jou?', 'En welke kleur past bij hoe je je vandaag voelt?'),
  (81, 'Hoe los je ruzie op?', 'Denk aan een keer dat je het weer goedmaakte. Hoe ging dat?'),
  (82, 'Bedenk een nieuw dier', 'Hoe heet het, waar woont het en wat eet het?'),
  (83, 'Welk doel wil je deze maand halen?', 'Maak het klein en duidelijk, dan lukt het beter.'),
  (84, 'Hoe voelt blijdschap in je lichaam?', 'Kriebels in je buik? Een warm gevoel? Beschrijf het.'),
  (85, 'Schrijf over een feestdag die je fijn vond', 'Wat aten jullie en wat deden jullie?'),
  (86, 'Wat zeg je tegen jezelf als iets mislukt?', 'Probeer het eens net zo lief te zeggen als tegen een vriend.'),
  (87, 'Wat zou je doen als je een dag in het bos woonde?', 'Hoe zou je hut eruitzien?'),
  (88, 'Luister vandaag extra goed naar iemand', 'Wat heb je gehoord wat je anders had gemist?'),
  (89, 'Wat als je een dag zo klein was als een mier?', 'Wat zou je allemaal zien?'),
  (90, 'Wat doe je als iets niet meteen lukt?', 'Hoe kun je jezelf aanmoedigen?'),
  (91, 'Wat is je lievelingsdrankje?', 'Warm of koud?'),
  (92, 'Noem iemand die altijd voor je klaarstaat', 'Schrijf op wat die persoon doet waardoor jij je fijn voelt.'),
  (93, 'Wat vind je belangrijk in het leven?', 'Kies drie dingen, bijvoorbeeld eerlijkheid, plezier of familie.'),
  (94, 'Wat zou je tegen een nieuw kind in de klas zeggen?', 'Hoe zorg je ervoor dat iemand zich welkom voelt?'),
  (95, 'Schrijf een liedje over je dag', 'Gebruik de melodie van een liedje dat je al kent.'),
  (96, 'Wat zou je doen als je één dag de baas van Nederland was?', 'Welke regel zou je veranderen?'),
  (97, 'Wat helpt jou als je zenuwachtig bent?', 'Diep ademen, muziek, praten? Schrijf je tips op.'),
  (98, 'Wat was je lievelingsprogramma toen je klein was?', 'Waarom vond je het zo leuk?'),
  (99, 'Waar heb je vandaag even rust nodig?', 'Plan een klein momentje voor jezelf.'),
  (100, 'Zoek een mooie steen of een blaadje', 'Waarom koos je juist deze?'),
  (101, 'Bedenk drie manieren om lief te zijn op school of werk', 'Probeer er vandaag eentje!'),
  (102, 'Met welk beroemd persoon zou je willen lunchen?', 'Wat vraag je?'),
  (103, 'Leer vandaag een nieuw woord', 'Schrijf het op en gebruik het in een zin.'),
  (104, 'Welk liedje zit er vandaag in je hoofd?', 'Waar heb je het gehoord?'),
  (105, 'Welk spulletje zou je nooit weggeven?', 'Vertel wat het is en waarom het zo bijzonder is.'),
  (106, 'Waar ben je trots op?', 'Groot of klein, het telt allemaal!'),
  (107, 'Welke oudere persoon heeft jou iets geleerd?', 'Een opa, oma, buurvrouw of iemand anders?'),
  (108, 'Maak een lijstje met mooie woorden', 'Woorden die fijn klinken als je ze hardop zegt.'),
  (109, 'Waar droom je vaak over?', 'Over je toekomst of echte dromen in je slaap?'),
  (110, 'Schrijf over iets wat je nog dwarszit', 'Opschrijven kan opluchten. Wie kan je erbij helpen?'),
  (111, 'Schrijf over een keer dat je heel hard moest lachen', 'Lach je er nu nog om?'),
  (112, 'Leg je telefoon een uur weg en schrijf wat je deed', 'Hoe voelde het?'),
  (113, 'Wat is je favoriete plek in de natuur?', 'Het strand, het bos, een park?'),
  (114, 'Wat zou je doen als je iemand alleen ziet zitten?', 'Hoe kun je diegene erbij betrekken?'),
  (115, 'Als je een robot had, wat moet hij doen?', 'Geef hem een naam!'),
  (116, 'Wat is een fout waar je trots op bent?', 'Soms leer je het meest van wat misgaat.'),
  (117, 'Wat was het grappigste berichtje dat je vandaag kreeg?', 'Van wie?'),
  (118, 'Waar heb je vandaag om gelachen?', 'Schrijf het grappige moment op, dan kun je er later nog eens om lachen.'),
  (119, 'Wat is je lievelingswoord?', 'Waarom vind je het zo mooi of grappig?'),
  (120, 'Schrijf over iemand die je mist', 'Wat zou je tegen die persoon willen zeggen?'),
  (121, 'Teken je diertje uit de app in jouw stijl', 'Geef het een nieuw outfitje of een nieuwe plek.'),
  (122, 'Welke vaardigheid wil je over een jaar hebben?', 'Wat kun je vandaag al doen om te beginnen?'),
  (123, 'Wat maakt jou zacht en lief vanbinnen?', 'Een knuffel, een lief woord, een dier?'),
  (124, 'Wat is een herinnering aan opa, oma of een ander familielid?', 'Wat deden jullie samen?'),
  (125, 'Wat is jouw lievelingsmanier van bewegen?', 'Dansen, fietsen, zwemmen of iets anders?'),
  (126, 'Hoe kun jij helpen om de natuur te beschermen?', 'Bedenk iets kleins wat je deze week kunt doen.'),
  (127, 'Schrijf een bedankkaartje voor iemand', 'Je mag het ook echt geven.'),
  (128, 'Wat als het een dag snoep regende?', 'Wat zou je doen?'),
  (129, 'Zoek een leuk weetje op', 'Schrijf het op en vertel het aan iemand.'),
  (130, 'Wat zit er in je tas?', 'Is er iets geks bij?'),
  (131, 'Bedank jezelf ergens voor', 'Wat heb jij goed gedaan deze week? Je mag best trots zijn.'),
  (132, 'Hoe ziet jouw perfecte zaterdag eruit?', 'Van het moment dat je wakker wordt tot je gaat slapen.'),
  (133, 'Wat is het liefste wat iemand ooit voor je deed?', 'Hoe voelde je je toen?'),
  (134, 'Schrijf een verhaal van 6 woorden', 'Een heel verhaal in maar zes woorden. Lukt het?'),
  (135, 'Wat zou je doen met een vrije week?', 'Zonder school of werk. Plan je droomweek!'),
  (136, 'Welk weer past bij je gevoel van vandaag?', 'Zonnig, bewolkt, storm of regenboog?'),
  (137, 'Welke geur doet je aan vroeger denken?', 'Waar ben je dan in gedachten?'),
  (138, 'Schrijf een lief briefje aan jezelf', 'Wat heb je nodig om te horen?'),
  (139, 'Schrijf over regen', 'Vind je regen fijn of juist niet? Waarom?'),
  (140, 'Hoe kun je een dier blij maken?', 'Je eigen huisdier, een dier in de buurt of je diertje in de app.'),
  (141, 'Je mag een nieuwe kleur uitvinden', 'Hoe heet hij en hoe ziet hij eruit?'),
  (142, 'Wat wil je beter begrijpen over de wereld?', 'Hoe kun je er meer over leren?'),
  (143, 'Hoe ziet je kamer er nu uit?', 'Opgeruimd of een gezellige rommel?'),
  (144, 'Wat is er mooi aan het seizoen van nu?', 'Denk aan het weer, de kleuren buiten of feestdagen die eraan komen.'),
  (145, 'Wat doe je als je je verveelt?', 'En wat zou je eigenlijk eens willen proberen?'),
  (146, 'Met wie zou je een dag willen ruilen?', 'Waarom? En wat zou je die dag doen?'),
  (147, 'Bedenk een uitvinding die de wereld beter maakt', 'Wat doet het en hoe werkt het?'),
  (148, 'Hoe wil je dat mensen zich bij jou voelen?', 'Hoe kun je daar vandaag al aan werken?'),
  (149, 'Wat zou je tegen een vriend zeggen die zich net zo voelt als jij nu?', 'Zeg dat nu ook eens tegen jezelf.'),
  (150, 'Schrijf over een spannend avontuur', 'Iets wat je ooit meemaakte en heel spannend vond.'),
  (151, 'Wat maakt je ochtend fijn?', 'Bedenk een klein ochtendritueel.'),
  (152, 'Welk dier zou je willen zijn?', 'Wat zou je de hele dag doen?'),
  (153, 'Maak iemand aan het lachen', 'Hoe deed je het?'),
  (154, 'Welk dier zou je als huisdier willen, al is het onmogelijk?', 'Een draak, een pinguïn, een giraf?'),
  (155, 'Wie zou je om hulp kunnen vragen bij iets moeilijks?', 'Durf het eens te vragen!'),
  (156, 'Wat was het lekkerste wat je deze week at?', 'Wie had het gemaakt?'),
  (157, 'Welk dier maakt jou blij?', 'Is het je eigen huisdier, een dier in de natuur of je diertje in de app?'),
  (158, 'Welke gewoonte van jou vind je fijn?', 'Iets wat je vaak doet en waar je je goed bij voelt.'),
  (159, 'Wat vind je fijn aan je klas, team of werk?', 'Zijn er mensen waar je graag mee samenwerkt?'),
  (160, 'Maak een collage van dingen die je blij maken', 'Plaatjes, woorden of foto''s. Maak er een foto van!'),
  (161, 'Welke club of hobby wil je proberen?', 'Wat houdt je tegen, en hoe kun je beginnen?'),
  (162, 'Wanneer heb je voor het laatst flink gelachen?', 'Wat was er zo grappig?'),
  (163, 'Wat was het lekkerste wat je ooit at?', 'Waar was je en wie had het gemaakt?'),
  (164, 'Wat doe jij om je hoofd leeg te maken?', 'Schrijven helpt soms ook!'),
  (165, 'Maak een wandeling en tel wat je ziet', 'Hoeveel vogels, hoeveel honden, hoeveel bloemen?'),
  (166, 'Wat is een goede daad die je laatst zag?', 'Wie deed het?'),
  (167, 'Wat als je kon vliegen?', 'Waar vlieg je als eerste naartoe?'),
  (168, 'Welk nieuw ding heb je deze week geprobeerd?', 'Hoe ging het?'),
  (169, 'Welk filmpje heb je laatst gezien?', 'Wat vond je ervan?'),
  (170, 'Welke leraar of coach heeft je geholpen?', 'Schrijf op wat die persoon jou geleerd heeft.'),
  (171, 'Waar ben je een beetje bang voor?', 'Schrijf het op. Soms wordt iets kleiner als je het op papier zet.'),
  (172, 'Hoe laat je iemand merken dat je om hem of haar geeft?', 'En hoe merk jij dat anderen om jou geven?'),
  (173, 'Beschrijf een kleur aan iemand die niet kan zien', 'Hoe voelt geel? Hoe klinkt blauw?'),
  (174, 'Schrijf over je droomfeest', 'Wat vier je, waar is het en wie komen er?'),
  (175, 'Wat doe je als je boos bent?', 'Wat werkt goed en wat zou je anders willen doen?'),
  (176, 'Schrijf over je eerste huisdier of lievelingsdier', 'Of welk huisdier je graag had gehad.'),
  (177, 'Welke eigenschap van jezelf wil je meer waarderen?', 'Waarom is die eigenschap fijn?'),
  (178, 'Wat vind je mooi aan de nacht?', 'De sterren, de maan, de stilte?'),
  (179, 'Help een vriend met iets waar hij of zij goed in wil worden', 'Hoe hielp je?'),
  (180, 'Je wint een prijs. Waarvoor?', 'Wat zeg je in je speech?'),
  (181, 'Wat is het slimste wat je ooit hebt gedaan?', 'Waarom was het slim?'),
  (182, 'Wat is je favoriete plek om te zitten?', 'Op de bank, op je bed, op de grond?'),
  (183, 'Wat is iets dat je vroeger moeilijk vond en nu kunt?', 'Kijk eens hoeveel je al gegroeid bent!'),
  (184, 'Wat zou je graag beter willen kunnen?', 'Wat is een eerste kleine stap?'),
  (185, 'Wat is een goede vraag om iemand beter te leren kennen?', 'Bedenk er drie en probeer er eentje uit!'),
  (186, 'Schrijf een brief aan je knuffel of lievelingsspulletje', 'Wat zou je het willen vertellen?'),
  (187, 'Wat wil je ooit nog eens durven?', 'Iets spannends dat je stiekem graag wilt doen.'),
  (188, 'Schrijf over een moment dat je je trots voelde', 'Wat had je gedaan?'),
  (189, 'Wat is iets wat je vroeger geloofde en nu niet meer?', 'Bijvoorbeeld over monsters, sprookjes of volwassenen.'),
  (190, 'Hoe kun je vandaag lief zijn voor jezelf?', 'Iets kleins is genoeg.'),
  (191, 'Welke planten of dieren leven bij jou in de buurt?', 'Ga eens op ontdekkingstocht.'),
  (192, 'Zeg vandaag tegen iemand wat je aan hem of haar waardeert', 'Hoe reageerde die persoon?'),
  (193, 'Wat zou je doen in een pretpark helemaal voor jou alleen?', 'In welke attractie ga je als eerste?'),
  (194, 'Hoe leer jij het fijnst?', 'Door te lezen, te kijken, te doen of uit te leggen?'),
  (195, 'Wat heb je vandaag gedronken?', 'Genoeg water gehad?'),
  (196, 'Waar ben je blij om dat je het hebt?', 'Een bed, een telefoon, een fiets… Wat zou je echt missen?'),
  (197, 'Hoe ga jij om met stress?', 'Wat helpt jou om rustig te worden?'),
  (198, 'Schrijf over een keer dat je iemand hielp', 'Hoe voelde het om te helpen?'),
  (199, 'Bedenk een nieuwe feestdag', 'Hoe heet hij, wanneer is het en hoe vier je hem?'),
  (200, 'Hoe ziet een perfecte dag over 10 jaar eruit?', 'Waar woon je, wat doe je, met wie ben je?'),
  (201, 'Wat maakt jou onzeker?', 'En wat zou je tegen jezelf zeggen om je sterker te voelen?'),
  (202, 'Schrijf over een keer dat je verdwaald was', 'Hoe vond je de weg terug?'),
  (203, 'Wat helpt jou als je verdrietig bent?', 'Maak een lijstje voor later.'),
  (204, 'Schrijf over de zon op je huid', 'Hoe voelt dat?'),
  (205, 'Wat kun je doen voor je buren?', 'Een groet, een helpende hand?'),
  (206, 'Als je een boek was, welk boek ben je?', 'Waar gaat het over?'),
  (207, 'Waar heb je deze maand vooruitgang in geboekt?', 'Hoe merk je dat?'),
  (208, 'Welke sokken heb je aan?', 'Hebben ze een leuk motief?'),
  (209, 'Schrijf over een fijn geurtje', 'Vers brood, regen, zonnebrand… Welke geur maakt jou blij en waarom?'),
  (210, 'Wat is je lievelingsseizoen en waarom?', 'Denk aan het weer, kleding, eten en activiteiten.'),
  (211, 'Wat maakt een groep fijn om in te zitten?', 'Denk aan de groepen in de app, je klas of een club.'),
  (212, 'Ontwerp je eigen logo', 'Welke vormen en kleuren passen bij jou?'),
  (213, 'Welke wereldplek wil je met eigen ogen zien?', 'Waarom juist die plek?'),
  (214, 'Hoe voel je je als je wakker wordt?', 'En hoe zou je je ochtend fijner kunnen maken?'),
  (215, 'Wat is een cadeau dat je nooit vergeet?', 'Van wie kreeg je het?'),
  (216, 'Welke grens wil je beter aangeven?', 'Nee zeggen mag ook. Wanneer wil je dat vaker doen?'),
  (217, 'Wat zou een vogel van jouw straat denken?', 'Schrijf vanuit de vogel.'),
  (218, 'Schrijf over een keer dat iemand lief tegen jou was', 'Hoe kun je dat doorgeven?'),
  (219, 'Wat als je een dag de leraar of de baas was?', 'Wat zou je anders doen?'),
  (220, 'Wat zou je willen weten over de ruimte?', 'Of over de zee, of over dieren?'),
  (221, 'Hoe was het weer vandaag?', 'Paste je kleding erbij?'),
  (222, 'Wie heeft jou laatst geholpen?', 'Hoe hielp die persoon jou, en hoe voelde dat?'),
  (223, 'Welk karakter uit een boek of film lijkt op jou?', 'Waarin lijken jullie op elkaar?'),
  (224, 'Welk spel speel je het liefst met anderen?', 'Waarom is dat spel zo leuk?'),
  (225, 'Schrijf een gedicht met de letters van je naam', 'Elke regel begint met een letter van je naam.'),
  (226, 'Wat hoop je dat er volgend jaar gebeurt?', 'Voor jezelf, je familie of de wereld.'),
  (227, 'Welk liedje past bij je gevoel van nu?', 'Waarom past het zo goed?'),
  (228, 'Welke foto op je telefoon maakt je blij?', 'Wat zie je erop en wat gebeurde er toen?'),
  (229, 'Wat eet je het liefst als je je niet zo lekker voelt?', 'Waarom helpt dat?'),
  (230, 'Wat zie je als je uit het raam kijkt?', 'Beschrijf het zo precies mogelijk.'),
  (231, 'Hoe kun je de wereld een klein beetje mooier maken?', 'Bedenk iets wat je deze week kunt doen.'),
  (232, 'Je mag een kasteel ontwerpen', 'Wat zit er allemaal in?'),
  (233, 'Wat is een goede gewoonte die je wilt starten?', 'Hoe ga je het onthouden?'),
  (234, 'Wat is het leukste wat er op je telefoon staat?', 'Een foto, een spelletje, een berichtje?'),
  (235, 'Wat was het beste moment van deze week?', 'Beschrijf het zo precies mogelijk: waar was je, met wie, wat gebeurde er?'),
  (236, 'Wat is iets wat mensen vaak niet over jou weten?', 'Je hoeft het met niemand te delen, alleen met je dagboek.'),
  (237, 'Hoe zou jij een vriendschapsfeest vieren?', 'Wie nodig je uit, en wat gaan jullie doen?'),
  (238, 'Bedenk een recept voor een goed humeur', 'Bijvoorbeeld: 2 scheppen zon, 1 snufje muziek…'),
  (239, 'Wat zou je willen uitvinden?', 'Iets wat jouw leven of dat van anderen makkelijker maakt.'),
  (240, 'Schrijf drie gevoelens op die je vandaag had', 'Welke was het sterkst?'),
  (241, 'Schrijf over een sneeuwdag of een hele warme dag', 'Wat deed je die dag?'),
  (242, 'Wat zijn je drie favoriete knuffelwoorden?', 'Woorden die je goed doen als je ze hoort.'),
  (243, 'Waar zou je willen kamperen?', 'Wat neem je mee?'),
  (244, 'Ruim samen met iemand iets op', 'Samen gaat het vaak sneller én leuker.'),
  (245, 'Wat als je met dieren kon praten?', 'Welk dier vraag je wat?'),
  (246, 'Schrijf drie dingen op die je goed hebt gedaan deze week', 'Ook kleine dingen tellen!'),
  (247, 'Hoe laat ging je gisteren naar bed?', 'Voel je je uitgerust?'),
  (248, 'Welk boek, serie of film maakt je blij?', 'Waarom vind je het zo leuk? Wie zou je het aanraden?'),
  (249, 'Wat maakt jou boos, en wat doe je dan?', 'Boos zijn mag. Wat helpt jou om het weer rustig te krijgen?'),
  (250, 'Wat heb je van een vriend geleerd?', 'Iets wat je nu zelf ook doet of weet.'),
  (251, 'Maak een stripje van iets wat vandaag gebeurde', 'Drie of vier plaatjes is genoeg.'),
  (252, 'Welk dier zou je ooit willen zien in het echt?', 'Waar leeft het?'),
  (253, 'Wanneer voel je je echt jezelf?', 'Met wie ben je dan, of wat doe je dan?'),
  (254, 'Wat was een moment dat alles goed voelde?', 'Beschrijf waar je was en wat je zag.'),
  (255, 'Zet een fijn liedje op en schrijf erover', 'Waarom koos je dit liedje?'),
  (256, 'Wat is het mooiste wat je ooit in de natuur zag?', 'Een regenboog, een hert, een zonsondergang?'),
  (257, 'Wat kun je doen om iemand welkom te laten voelen?', 'In een groep, in de klas of in de app.'),
  (258, 'Welk sprookjesfiguur zou je willen zijn?', 'Waarom?'),
  (259, 'Wat heb je van een moeilijke situatie geleerd?', 'Hoe ben je er sterker door geworden?'),
  (260, 'Wat heb je vandaag gekocht of gekregen?', 'Iets nodigs of iets leuks?'),
  (261, 'Waar ben je dankbaar voor in je vriendschappen?', 'Wat maakt jouw vrienden zo fijn?'),
  (262, 'Welke drie dingen neem je mee naar een onbewoond eiland?', 'En waarom juist die drie?'),
  (263, 'Wie maakt jou altijd aan het lachen?', 'Wat doet die persoon dan precies?'),
  (264, 'Schrijf een verhaal vanuit je huisdier of diertje', 'Wat denkt het de hele dag?'),
  (265, 'Wat is een klein doel voor morgen?', 'Iets wat je morgen kunt doen en waar je trots op kunt zijn.'),
  (266, 'Wat doe je als je iets spannends moet doen?', 'Bedenk een trucje voor de volgende keer.'),
  (267, 'Wat leerde je van een fout die je ooit maakte?', 'Fouten maken hoort erbij. Wat heb je ervan geleerd?'),
  (268, 'Wat doe je om je energie op te laden?', 'Ben je meer iemand van rust of van actie?'),
  (269, 'Plant iets of zorg voor een plant', 'Schrijf op hoe het gaat.'),
  (270, 'Vraag iemand hoe het echt met hem of haar gaat', 'En luister echt naar het antwoord.'),
  (271, 'Je mag één regel in de natuurkunde veranderen', 'Wat verander je en wat gebeurt er dan?'),
  (272, 'Welke vraag zou je aan een expert willen stellen?', 'Een dokter, een astronaut, een kok?'),
  (273, 'Welk geluid hoor je het meest in je huis?', 'Een wasmachine, gelach, muziek?'),
  (274, 'Noem 5 kleine dingen die je dag beter maakten', 'Een glimlach, een warme douche, een leuk berichtje…'),
  (275, 'Ben je meer een prater of een luisteraar?', 'Wat vind je fijn aan hoe jij bent?'),
  (276, 'Hoe ga je om met iemand die anders denkt?', 'Kun je toch iets van die persoon leren?'),
  (277, 'Bedenk een nieuwe sport', 'Wat zijn de regels en wat heb je nodig?'),
  (278, 'Waar wil je goed in worden?', 'Wie kan je daarbij helpen?'),
  (279, 'Wat maakt jou jaloers?', 'Jaloers zijn is normaal. Wat zegt het over wat jij graag wilt?'),
  (280, 'Schrijf over je eerste vriendje of vriendinnetje', 'Speelden jullie samen? Wat deden jullie?'),
  (281, 'Wanneer was je voor het laatst buiten?', 'Ga even naar buiten en schrijf wat je zag.'),
  (282, 'Hoe ruikt het buiten vandaag?', 'Probeer het te beschrijven.'),
  (283, 'Geef iemand een high five of een knuffel', 'Natuurlijk alleen als diegene dat fijn vindt!'),
  (284, 'Wat als je een week in een boomhut woonde?', 'Wat neem je mee?'),
  (285, 'Wat is iets wat je anders ziet dan vroeger?', 'Wat heeft ervoor gezorgd dat je anders ging denken?'),
  (286, 'Wat is je favoriete snack?', 'Zoet of zout?'),
  (287, 'Welk talent heb jij gekregen?', 'Iedereen is ergens goed in. Waar ben jij goed in?'),
  (288, 'Wat is jouw manier om iemand op te vrolijken?', 'Een grapje, een knuffel, een kaartje?'),
  (289, 'Wat zou je een jonger kind willen leren?', 'Iets wat jij al weet en wat handig is.'),
  (290, 'Beschrijf een geluid dat je nu hoort', 'Schrijf het zo dat iemand anders het ook bijna hoort.'),
  (291, 'Wat zou je doen als je niet bang kon zijn?', 'Schrijf op wat je dan meteen zou doen.'),
  (292, 'Hoe zorg je voor jezelf als je moe bent?', 'Wat heb je dan nodig?'),
  (293, 'Wat is een plek waar je vroeger vaak kwam?', 'Hoe ziet die plek er nu uit?'),
  (294, 'Wat mag je van jezelf iets minder streng nemen?', 'Niemand is perfect. Waar mag je iets milder zijn?'),
  (295, 'Wat doe je het liefst op een zonnige dag?', 'En op een regenachtige dag?'),
  (296, 'Schrijf een positieve boodschap op een briefje', 'Leg het ergens neer waar iemand het vindt.'),
  (297, 'Als jij een snoepje was, welke smaak heb je?', 'En hoe ziet je papiertje eruit?'),
  (298, 'Leer vandaag iets nieuws uit een filmpje of boek', 'Wat was het?'),
  (299, 'Wat heb je vandaag gemaakt?', 'Een tekening, een broodje, een huiswerkopdracht?'),
  (300, 'Waar ben je dankbaar voor in je familie?', 'Denk aan een gewoonte, een grapje of een persoon.'),
  (301, 'Waar kun jij helemaal in opgaan?', 'Iets waarbij je de tijd vergeet.'),
  (302, 'Schrijf over iemand die dapper is', 'Wat deed die persoon waardoor je dat vindt?'),
  (303, 'Ontwerp een outfit voor je lievelingsfeest', 'Teken of beschrijf alles van top tot teen.'),
  (304, 'Schrijf over je droombaan', 'Wat doe je de hele dag?'),
  (305, 'Wat is iets wat je wilde zeggen maar niet zei?', 'Schrijf het hier op.'),
  (306, 'Schrijf over een uitje met school', 'Waar gingen jullie heen?'),
  (307, 'Schrijf je avondritueel op', 'Wat doe je voor het slapengaan? Wat zou je willen toevoegen?'),
  (308, 'Welk insect vind je interessant?', 'Wat weet je erover?'),
  (309, 'Wat zou je voor je familie willen doen?', 'Iets kleins waar ze blij van worden.'),
  (310, 'Je kunt één ding uit een film echt maken', 'Wat kies je?'),
  (311, 'Wat motiveert jou?', 'Waar krijg je zin van om iets te doen?'),
  (312, 'Wie heb je vandaag als eerste gesproken?', 'Waar ging het over?'),
  (313, 'Schrijf een bedankbriefje aan je toekomstige zelf', 'Bedank jezelf alvast voor alles wat je nog gaat doen.'),
  (314, 'Hoe zou jouw superheldnaam zijn?', 'En wat is je superkracht?'),
  (315, 'Wat is een mooi compliment dat je kreeg?', 'Weet je nog wie het zei? Hoe voelde dat?'),
  (316, 'Schrijf een gedichtje over regen', 'Hoe klinkt het, hoe ruikt het, hoe voelt het?'),
  (317, 'Wat wil je je kinderen of jongere mensen later vertellen?', 'Welke les wil je doorgeven?'),
  (318, 'Wanneer voelde je je laatst blij verrast?', 'Wat gebeurde er?'),
  (319, 'Wat was een dag waarop je iets nieuws durfde?', 'Hoe voelde dat?'),
  (320, 'Wie kun jij bellen als het even niet gaat?', 'Schrijf de namen op. Je staat er niet alleen voor.'),
  (321, 'Zoek een plekje buiten om even te zitten', 'Wat merk je op als je stil bent?'),
  (322, 'Bedank iemand die vaak vergeten wordt', 'De schoonmaker, de buschauffeur, de kantinejuf?'),
  (323, 'Wat als je wakker werd in een computerspel?', 'Welk spel is het en wat doe je?'),
  (324, 'Hoe vier jij een succes?', 'Ook kleine successen verdienen een feestje!'),
  (325, 'Wat is iets dat je vandaag voor het eerst deed?', 'Ook een kleinigheid telt!'),
  (326, 'Wat is iets moois dat je vandaag zag?', 'Een wolk, een kunstwerk, een lieve actie… Beschrijf het.'),
  (327, 'Wat vind je lastig om te vragen aan anderen?', 'Hoe zou je het toch kunnen vragen?'),
  (328, 'Hoe kun je een vriendschap sterker maken?', 'Bedenk één ding dat je deze week kunt doen.'),
  (329, 'Maak een playlist voor je week', 'Kies vijf liedjes en schrijf op waarom.'),
  (330, 'Wat zou je kopen als je een miljoen had?', 'En wat zou je weggeven?'),
  (331, 'Wat zou je willen loslaten?', 'Een zorg, een gedachte of een gewoonte. Schrijf het op en laat het gaan.'),
  (332, 'Welke herinnering wil je nooit vergeten?', 'Schrijf hem op, dan blijft hij bewaard.'),
  (333, 'Wat is een klein cadeautje voor jezelf vandaag?', 'Een warm drankje, een dutje, een leuk filmpje?'),
  (334, 'Wat vind je fijn aan de zee of aan water?', 'Zwemmen, kijken, luisteren?'),
  (335, 'Hoe help je iemand die gepest wordt?', 'Wat kun je doen of tegen wie kun je het zeggen?'),
  (336, 'Welk geluid zou je willen kunnen maken?', 'Een leeuwengebrul? Een vogelfluit?'),
  (337, 'Welk boek zou iedereen moeten lezen?', 'Waarom?'),
  (338, 'Welk spelletje heb je laatst gespeeld?', 'Won je?'),
  (339, 'Welke uitvinding ben je dankbaar voor?', 'Muziek op je telefoon? Een warme verwarming? Leg uit waarom.'),
  (340, 'Welke regel zou je zelf willen bedenken?', 'Voor thuis, op school of in de hele wereld.'),
  (341, 'Wie zou je een kaartje willen sturen?', 'Wat zou erop staan?'),
  (342, 'Bedenk een titel voor de film van jouw leven', 'En wie zou jou spelen?'),
  (343, 'Welke gewoonte wil je volgend jaar hebben?', 'Hoe kun je daar nu al mee oefenen?'),
  (344, 'Welk gevoel wil je morgen meer hebben?', 'Wat kun je doen om dat gevoel te krijgen?'),
  (345, 'Schrijf over iets wat je vorig jaar deed', 'Wat is er sindsdien veranderd?'),
  (346, 'Hoe zorg jij voor je lichaam?', 'Slapen, eten, bewegen: wat gaat goed en wat kan beter?'),
  (347, 'Wat zou je doen als dieren konden praten?', 'Wat zou je ze vragen?'),
  (348, 'Deel iets lekkers met iemand', 'Wat deelde je en met wie?'),
  (349, 'Wat als je de wereld rond kon reizen in één dag?', 'Welke plekken zie je?'),
  (350, 'Wat zou je willen leren van iemand uit je familie?', 'Vraag het eens!'),
  (351, 'Wat ruik je op dit moment?', 'Probeer het te beschrijven.'),
  (352, 'Wat vind je fijn aan jezelf?', 'Schrijf drie dingen op. Het mag over je karakter gaan of over wat je kunt.'),
  (353, 'Wat heb je deze maand over jezelf geleerd?', 'Iets nieuws ontdekt? Schrijf het op.'),
  (354, 'Wat vind je belangrijk als je met iemand praat?', 'Luisteren, eerlijk zijn, grapjes maken?'),
  (355, 'Schrijf een verhaal dat begint met: Opeens ging het licht uit…', 'Wat gebeurt er daarna?'),
  (356, 'Wat is je allergrootste droom?', 'Schrijf hem op, hoe groot hij ook is!'),
  (357, 'Hoe ziet jouw veilige plek eruit?', 'Een echte plek of een plek in je fantasie.'),
  (358, 'Wat is het mooiste wat je ooit hebt gemaakt?', 'Een tekening, een taart, een hut?'),
  (359, 'Welke gedachte wil je vandaag vaker denken?', 'Bijvoorbeeld: Ik doe mijn best en dat is genoeg.'),
  (360, 'Schrijf over de wind', 'Hoe hard waait het vandaag? Wat beweegt er?'),
  (361, 'Schrijf over iemand die altijd aardig is', 'Wat kun je van die persoon leren?'),
  (362, 'Als je een dag een dier mocht zijn, welk dier ben je?', 'Hoe ziet je dag eruit?'),
  (363, 'Hoe ben je dit jaar gegroeid?', 'Kijk terug: wat is er veranderd aan jou?'),
  (364, 'Wat was het leukste moment van vandaag?', 'En wat zou je morgen graag willen meemaken?'),
  (365, 'Wat is je favoriete emoji?', 'Waarom past die bij jou?')
ON CONFLICT (day_no) DO UPDATE SET title = excluded.title, description = excluded.description;

CREATE OR REPLACE FUNCTION public.today_challenge()
RETURNS SETOF public.daily_challenges LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d date := (now() AT TIME ZONE 'Europe/Amsterdam')::date; n int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.daily_challenges WHERE challenge_date = d) THEN
    n := ((d - DATE '2026-01-01') % 365 + 365) % 365 + 1;
    INSERT INTO public.daily_challenges (challenge_date, title, description)
      SELECT d, p.title, p.description FROM public.challenge_pool p WHERE p.day_no = n
      ON CONFLICT (challenge_date) DO NOTHING;
  END IF;
  RETURN QUERY SELECT * FROM public.daily_challenges WHERE challenge_date = d;
END $$;
REVOKE ALL ON FUNCTION public.today_challenge() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.today_challenge() TO authenticated;

-- Only log challenge changes made by admins, not the automatic daily pick.
DROP TRIGGER IF EXISTS log_challenges ON public.daily_challenges;
CREATE TRIGGER log_challenges AFTER INSERT OR UPDATE OR DELETE ON public.daily_challenges
  FOR EACH ROW WHEN (public.has_role(auth.uid(), 'admin')) EXECUTE FUNCTION public.log_admin_activity();
COMMIT;

-- ===== 0050_hide_journals =====
-- The shop no longer sells journals (printable pdf's): digital goods would need Apple/Google in-app payments.
UPDATE public.shop_products SET is_active = false WHERE category = 'journals' OR kind = 'digitaal';
COMMIT;

-- ===== 0051_chat_attachments =====
-- Photos (camera or gallery) and files in private chats and groups.
-- Same model as voice memos: private bucket, path "<sender>/<dm|group>/<conversation|group>/<file>",
-- uploads only where you may post, reading only for messages you can see.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('chat-files', 'chat-files', false, 20971520, ARRAY[
    'image/*', 'video/mp4', 'video/quicktime', 'video/webm', 'application/pdf', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ])
ON CONFLICT (id) DO UPDATE SET file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS attachment_path text, ADD COLUMN IF NOT EXISTS attachment_name text, ADD COLUMN IF NOT EXISTS attachment_type text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS attachment_path text, ADD COLUMN IF NOT EXISTS attachment_name text, ADD COLUMN IF NOT EXISTS attachment_type text;

CREATE OR REPLACE FUNCTION public.validate_chat_attachment() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE expected text;
BEGIN
  IF TG_TABLE_NAME = 'direct_messages' THEN expected := NEW.sender_id::text || '/dm/' || NEW.conversation_id::text || '/';
  ELSE expected := NEW.author_id::text || '/group/' || NEW.group_id::text || '/'; END IF;
  IF NEW.attachment_path IS NOT NULL AND (left(NEW.attachment_path, length(expected)) <> expected OR NEW.attachment_path LIKE '%..%') THEN
    RAISE EXCEPTION 'Ongeldige bijlage';
  END IF;
  IF NEW.attachment_name IS NOT NULL AND length(NEW.attachment_name) > 200 THEN RAISE EXCEPTION 'Bestandsnaam is te lang'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_dm_attachment ON public.direct_messages;
CREATE TRIGGER validate_dm_attachment BEFORE INSERT OR UPDATE ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.validate_chat_attachment();
DROP TRIGGER IF EXISTS validate_group_attachment ON public.posts;
CREATE TRIGGER validate_group_attachment BEFORE INSERT OR UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.validate_chat_attachment();

DROP POLICY IF EXISTS "upload own chat files" ON storage.objects;
DROP POLICY IF EXISTS "read accessible chat files" ON storage.objects;
DROP POLICY IF EXISTS "remove own chat files" ON storage.objects;
CREATE POLICY "upload own chat files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='chat-files' AND (storage.foldername(name))[1]=auth.uid()::text AND (((storage.foldername(name))[2]='dm' AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id::text=(storage.foldername(name))[3] AND auth.uid() IN (c.user_a,c.user_b) AND c.status='accepted' AND public.can_message(public.conv_other(c.id)))) OR ((storage.foldername(name))[2]='group' AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id::text=(storage.foldername(name))[3] AND public.is_member(g.id) AND public.can_access_group(g.id) AND NOT public.is_timed_out(auth.uid())))));
CREATE POLICY "read accessible chat files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='chat-files' AND ((storage.foldername(name))[1]=auth.uid()::text OR EXISTS (SELECT 1 FROM public.direct_messages m WHERE m.attachment_path=name) OR EXISTS (SELECT 1 FROM public.posts p WHERE p.attachment_path=name AND NOT p.is_hidden)));
CREATE POLICY "remove own chat files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='chat-files' AND (storage.foldername(name))[1]=auth.uid()::text);
COMMIT;

-- ===== 0052_pet_minigames =====
-- Minigames next to the pet (they replace the little house). Each finished game is logged;
-- the first 3 games per day give the pet 5 XP each. Scores only count for "your best score".
CREATE TABLE IF NOT EXISTS public.pet_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game text NOT NULL CHECK (game IN ('vangen', 'memory', 'ballonnen')),
  score integer NOT NULL CHECK (score BETWEEN 0 AND 1000),
  play_date date NOT NULL DEFAULT current_date,
  xp integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pet_games_user_day ON public.pet_games (user_id, play_date);
GRANT SELECT ON public.pet_games TO authenticated;
GRANT ALL ON public.pet_games TO service_role;
ALTER TABLE public.pet_games ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own games read" ON public.pet_games;
CREATE POLICY "own games read" ON public.pet_games FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.finish_pet_game(_game text, _score integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); rewarded int; reward int := 0;
BEGIN
  IF uid IS NULL OR NOT EXISTS (SELECT 1 FROM public.pets WHERE user_id = uid) THEN RAISE EXCEPTION 'Geen diertje'; END IF;
  -- one row lock per member so two games finishing at once can't both get the 3rd reward
  PERFORM 1 FROM public.pets WHERE user_id = uid FOR UPDATE;
  SELECT count(*) INTO rewarded FROM public.pet_games WHERE user_id = uid AND play_date = current_date AND xp > 0;
  IF rewarded < 3 THEN reward := 5; END IF;
  INSERT INTO public.pet_games (user_id, game, score, xp) VALUES (uid, _game, least(greatest(_score, 0), 1000), reward);
  IF reward > 0 THEN UPDATE public.pets SET xp = xp + reward WHERE user_id = uid; END IF;
  RETURN reward;
END $$;
REVOKE ALL ON FUNCTION public.finish_pet_game(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finish_pet_game(text, integer) TO authenticated;

-- Fix: pets_guard was SECURITY DEFINER, so inside it current_user was the owner and never
-- 'authenticated'; members could set their own XP. As SECURITY INVOKER it sees the real role,
-- while XP from care, to-do's and games (all SECURITY DEFINER) still gets through.
ALTER FUNCTION public.pets_guard() SECURITY INVOKER;
COMMIT;

-- ===== 0053_story_board =====
-- Story board: admins plan upcoming stories on a board (idee → schrijven → klaar → gepland → verschenen).
-- Members see the "gepland" ones (and ones that appeared in the last 14 days) and vote with a heart.
CREATE TABLE IF NOT EXISTS public.story_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  teaser text CHECK (char_length(teaser) <= 300),
  emoji text NOT NULL DEFAULT '📖',
  category text NOT NULL DEFAULT 'inspiratie',
  status text NOT NULL DEFAULT 'idee' CHECK (status IN ('idee', 'schrijven', 'klaar', 'gepland', 'verschenen')),
  planned_date date,
  sort double precision NOT NULL DEFAULT extract(epoch FROM now()),
  article_id uuid REFERENCES public.articles(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_plans TO authenticated;
GRANT ALL ON public.story_plans TO service_role;
ALTER TABLE public.story_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin story plans" ON public.story_plans;
CREATE POLICY "admin story plans" ON public.story_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.story_plans_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'verschenen' AND OLD.status IS DISTINCT FROM 'verschenen' THEN NEW.published_at := now(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS story_plans_touch ON public.story_plans;
CREATE TRIGGER story_plans_touch BEFORE UPDATE ON public.story_plans FOR EACH ROW EXECUTE FUNCTION public.story_plans_touch();

CREATE TABLE IF NOT EXISTS public.story_votes (
  plan_id uuid NOT NULL REFERENCES public.story_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.story_votes TO authenticated;
GRANT ALL ON public.story_votes TO service_role;
ALTER TABLE public.story_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own story votes read" ON public.story_votes;
DROP POLICY IF EXISTS "vote on planned stories" ON public.story_votes;
DROP POLICY IF EXISTS "remove own story vote" ON public.story_votes;
-- Members can't read story_plans directly (RLS), so the vote policy asks this helper.
CREATE OR REPLACE FUNCTION public.story_is_planned(_plan uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.story_plans WHERE id = _plan AND status = 'gepland')
$$;
CREATE POLICY "own story votes read" ON public.story_votes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "vote on planned stories" ON public.story_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.story_is_planned(plan_id));
CREATE POLICY "remove own story vote" ON public.story_votes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- What members see: planned stories and the ones that appeared in the last 14 days, with heart counts
-- (never who voted). Admins get every story with its count, for the planning board.
CREATE OR REPLACE FUNCTION public.story_board()
RETURNS TABLE (id uuid, title text, teaser text, emoji text, category text, status text, planned_date date,
               sort double precision, article_id uuid, published_at timestamptz, votes bigint, voted boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.title, p.teaser, p.emoji, p.category, p.status, p.planned_date, p.sort, p.article_id, p.published_at,
         (SELECT count(*) FROM public.story_votes v WHERE v.plan_id = p.id),
         EXISTS (SELECT 1 FROM public.story_votes v WHERE v.plan_id = p.id AND v.user_id = auth.uid())
  FROM public.story_plans p
  WHERE public.has_role(auth.uid(), 'admin')
     OR p.status = 'gepland'
     OR (p.status = 'verschenen' AND p.published_at > now() - interval '14 days')
  ORDER BY p.planned_date NULLS LAST, p.sort
$$;
REVOKE ALL ON FUNCTION public.story_board() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.story_board() TO authenticated;
COMMIT;

-- ===== 0054_brain_games =====
-- The minigames are now about your brain and feelings (one new game per level).
-- Old game names stay allowed so earlier scores remain valid.
ALTER TABLE public.pet_games DROP CONSTRAINT IF EXISTS pet_games_game_check;
ALTER TABLE public.pet_games ADD CONSTRAINT pet_games_game_check
  CHECK (game IN ('ademen', 'memory', 'kleuren', 'gevoelens', 'lichtjes', 'gedachten', 'zoeken', 'vangen', 'ballonnen'));
COMMIT;

-- ===== 0055_wordpress_import =====
-- Stories imported from the WordPress site keep their WordPress post id,
-- so importing again updates them instead of adding duplicates.
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS wp_id bigint;
CREATE UNIQUE INDEX IF NOT EXISTS articles_wp_id_key ON public.articles (wp_id);
COMMIT;

-- ===== 0056_article_min_age =====
-- Stories can be for everyone (12+) or only for members of 16 and older.
-- The database enforces it: members under 16 (or without a birthdate) never get 16+ stories.
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS min_age integer NOT NULL DEFAULT 12;
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_min_age_check;
ALTER TABLE public.articles ADD CONSTRAINT articles_min_age_check CHECK (min_age IN (12, 16));

CREATE OR REPLACE FUNCTION public.my_age() RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT date_part('year', age(birthdate))::int FROM public.profiles WHERE id = auth.uid() AND birthdate IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.my_age() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_age() TO authenticated;

DROP POLICY IF EXISTS "read articles" ON public.articles;
CREATE POLICY "read articles" ON public.articles FOR SELECT TO authenticated
  USING ((is_published AND coalesce(public.my_age(), 12) >= min_age) OR public.has_role(auth.uid(), 'admin'));
COMMIT;

-- ===== 0057_discover_interactions =====
-- Ontdekken: supportive reactions (counts only, never who), saved stories and read marks.
-- Members can only react to / save / mark stories they are allowed to see (articles RLS, incl. 16+).
CREATE TABLE IF NOT EXISTS public.article_reactions (
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('herkenbaar', 'knuffel', 'sterk')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, user_id, kind)
);
CREATE TABLE IF NOT EXISTS public.article_saves (
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, user_id)
);
CREATE TABLE IF NOT EXISTS public.article_reads (
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, user_id)
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['article_reactions', 'article_saves', 'article_reads'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "own rows read" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "own rows add" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "own rows remove" ON public.%I', t);
    EXECUTE format('CREATE POLICY "own rows read" ON public.%I FOR SELECT TO authenticated USING (user_id = auth.uid())', t);
    -- The EXISTS runs with the member's own rights, so it only finds stories they may read.
    EXECUTE format('CREATE POLICY "own rows add" ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.articles a WHERE a.id = article_id))', t);
    EXECUTE format('CREATE POLICY "own rows remove" ON public.%I FOR DELETE TO authenticated USING (user_id = auth.uid())', t);
  END LOOP;
END $$;

-- Reaction counts for the stories the caller may see.
CREATE OR REPLACE FUNCTION public.article_reaction_counts()
RETURNS TABLE (article_id uuid, herkenbaar bigint, knuffel bigint, sterk bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id,
         count(*) FILTER (WHERE r.kind = 'herkenbaar'),
         count(*) FILTER (WHERE r.kind = 'knuffel'),
         count(*) FILTER (WHERE r.kind = 'sterk')
  FROM public.articles a
  JOIN public.article_reactions r ON r.article_id = a.id
  WHERE (a.is_published AND coalesce(public.my_age(), 12) >= a.min_age) OR public.has_role(auth.uid(), 'admin')
  GROUP BY a.id
$$;
REVOKE ALL ON FUNCTION public.article_reaction_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.article_reaction_counts() TO authenticated;
COMMIT;

-- ===== 0058_article_kind =====
-- Ontdekken has two kinds: personal stories ("verhaal") and informative articles ("artikel").
-- Everything already there (incl. the WordPress stories) stays a story.
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'verhaal';
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_kind_check;
ALTER TABLE public.articles ADD CONSTRAINT articles_kind_check CHECK (kind IN ('verhaal', 'artikel'));
COMMIT;

-- ===== 0059_story_submission_details =====
-- "Deel jouw verhaal" asks the same as the website: a name to show (optional), an e-mail address
-- for contact (optional) and whether CeritaProject may publish the story.
ALTER TABLE public.story_submissions ADD COLUMN IF NOT EXISTS pen_name text CHECK (char_length(pen_name) <= 80);
ALTER TABLE public.story_submissions ADD COLUMN IF NOT EXISTS contact_email text CHECK (char_length(contact_email) <= 200);
ALTER TABLE public.story_submissions ADD COLUMN IF NOT EXISTS may_publish boolean NOT NULL DEFAULT true;
COMMIT;

-- ===== 0060_admin_news =====
-- Nieuws for admins: new members, orders (owner only), submitted stories and reports in one list,
-- with "new since you last looked" kept per admin.
CREATE TABLE IF NOT EXISTS public.admin_news_seen (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  seen_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.admin_news_seen TO authenticated;
GRANT ALL ON public.admin_news_seen TO service_role;
ALTER TABLE public.admin_news_seen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own news seen" ON public.admin_news_seen;
CREATE POLICY "own news seen" ON public.admin_news_seen FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));
--> statement-breakpoint
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
COMMIT;

-- ===== 0061_admin_news_push =====
-- Push for admins when there is news. Each admin turns it on for themselves in Beheer → Nieuws;
-- the app then schedules a check every 5 minutes on its own address.
ALTER TABLE public.admin_news_seen ADD COLUMN IF NOT EXISTS push boolean NOT NULL DEFAULT false;
INSERT INTO public.cron_tokens(name) VALUES ('admin_news_push') ON CONFLICT (name) DO NOTHING;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public.admin_push_state (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_run timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_push_state TO service_role;
ALTER TABLE public.admin_push_state ENABLE ROW LEVEL SECURITY;
INSERT INTO public.admin_push_state(id) VALUES (1) ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.schedule_admin_news_push(site_url text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  RETURN cron.schedule('admin-news-push', '*/5 * * * *', format($job$
    SELECT net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(SELECT token FROM public.cron_tokens WHERE name='admin_news_push')),
      body := '{}'::jsonb)
    WHERE EXISTS (SELECT 1 FROM public.admin_news_seen WHERE push);
  $job$, rtrim(site_url, '/') || '/api/public/admin-news-push'));
END
$fn$;
REVOKE ALL ON FUNCTION public.schedule_admin_news_push(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_admin_news_push(text) TO service_role;
COMMIT;

-- ===== 0062_admin_messages =====
-- Members can send a message to the admins (a question, something they want to share);
-- admins answer in Beheer → Berichten, and only the sender sees the answer.
CREATE TABLE IF NOT EXISTS public.admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic text NOT NULL DEFAULT 'vraag' CHECK (topic IN ('vraag', 'idee', 'probleem', 'iets-anders')),
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 2 AND 2000),
  status text NOT NULL DEFAULT 'nieuw' CHECK (status IN ('nieuw', 'gelezen', 'beantwoord')),
  reply text,
  replied_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  replied_at timestamptz,
  reply_seen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_messages_user_idx ON public.admin_messages (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.admin_messages TO authenticated;
GRANT ALL ON public.admin_messages TO service_role;
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "send own message" ON public.admin_messages;
CREATE POLICY "send own message" ON public.admin_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'nieuw' AND reply IS NULL AND replied_by IS NULL AND replied_at IS NULL);
DROP POLICY IF EXISTS "read own or admin" ON public.admin_messages;
CREATE POLICY "read own or admin" ON public.admin_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
--> statement-breakpoint
-- Admins: mark as read or answer, in one checked step.
CREATE OR REPLACE FUNCTION public.answer_admin_message(_message uuid, _reply text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE answer text := nullif(trim(coalesce(_reply, '')), '');
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
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
REVOKE ALL ON FUNCTION public.answer_admin_message(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.answer_admin_message(uuid, text) TO authenticated;
--> statement-breakpoint
-- Members: mark the answers to your own messages as seen.
CREATE OR REPLACE FUNCTION public.mark_admin_replies_seen()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.admin_messages SET reply_seen = true
  WHERE user_id = auth.uid() AND reply IS NOT NULL AND NOT reply_seen
$$;
REVOKE ALL ON FUNCTION public.mark_admin_replies_seen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_admin_replies_seen() TO authenticated;
--> statement-breakpoint
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
COMMIT;

-- ===== 0063_media =====
-- Luisteren & kijken: podcasts, interviews and other recordings. Admins upload and schedule them;
-- members see an item from its publish moment, with the same 12+/16+ rule as stories.
CREATE TABLE IF NOT EXISTS public.media_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'podcast' CHECK (kind IN ('podcast', 'interview', 'video')),
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 140),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 4000),
  media_path text NOT NULL,
  media_type text NOT NULL DEFAULT 'audio' CHECK (media_type IN ('audio', 'video')),
  cover_path text,
  duration_seconds integer CHECK (duration_seconds >= 0),
  min_age integer NOT NULL DEFAULT 12 CHECK (min_age IN (12, 16)),
  publish_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS media_items_publish_idx ON public.media_items (publish_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_items TO authenticated;
GRANT ALL ON public.media_items TO service_role;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read published media" ON public.media_items;
CREATE POLICY "read published media" ON public.media_items FOR SELECT TO authenticated
  USING ((publish_at <= now() AND coalesce(public.my_age(), 12) >= min_age) OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins manage media" ON public.media_items;
CREATE POLICY "admins manage media" ON public.media_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
--> statement-breakpoint
-- Recordings and covers live in a private bucket; a file can be opened only when its item is visible to you.
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', false) ON CONFLICT (id) DO NOTHING;
CREATE OR REPLACE FUNCTION public.can_open_media(_path text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM public.media_items m
    WHERE (m.media_path = _path OR m.cover_path = _path)
      AND m.publish_at <= now() AND coalesce(public.my_age(), 12) >= m.min_age
  )
$$;
REVOKE ALL ON FUNCTION public.can_open_media(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_open_media(text) TO authenticated;
DROP POLICY IF EXISTS "open visible media" ON storage.objects;
DROP POLICY IF EXISTS "admins upload media" ON storage.objects;
DROP POLICY IF EXISTS "admins delete media" ON storage.objects;
CREATE POLICY "open visible media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND public.can_open_media(name));
CREATE POLICY "admins upload media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));
COMMIT;

-- ===== 0064_organisations_ready =====
-- Ready for working with organisations: consent per member, care signals for admins, and
-- anonymous impact numbers. Consent lives in its own table so other members never see it.
CREATE TABLE IF NOT EXISTS public.user_consents (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  terms_version text NOT NULL,
  terms_accepted_at timestamptz NOT NULL DEFAULT now(),
  parent_confirmed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.user_consents TO authenticated;
GRANT ALL ON public.user_consents TO service_role;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own consent" ON public.user_consents;
CREATE POLICY "own consent" ON public.user_consents FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "admins read consent" ON public.user_consents;
CREATE POLICY "admins read consent" ON public.user_consents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
--> statement-breakpoint
-- Care signals: words about suicide or self-harm in group posts, comments or private messages
-- are flagged for the admins, so someone can reach out. Only admins see them.
CREATE TABLE IF NOT EXISTS public.safety_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('post', 'comment', 'dm')),
  ref_id uuid NOT NULL,
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  excerpt text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'afgehandeld')),
  handled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.safety_alerts TO authenticated;
GRANT ALL ON public.safety_alerts TO service_role;
ALTER TABLE public.safety_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins see alerts" ON public.safety_alerts;
CREATE POLICY "admins see alerts" ON public.safety_alerts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins handle alerts" ON public.safety_alerts;
CREATE POLICY "admins handle alerts" ON public.safety_alerts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
--> statement-breakpoint
-- Same words as needsCare() in src/lib/care.ts.
CREATE OR REPLACE FUNCTION public.needs_care(_text text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$ SELECT coalesce(_text, '') ~* $re$(zelfmoord|zelfdoding|su[iï]cid|zelfbeschadig|zelfverwond|dood\s+(gaan\s+)?willen|wil\s+(\S+\s+){0,2}dood|er\s+niet\s+meer\s+(wil\s+|willen\s+)?zijn|niet\s+meer\s+(willen\s+)?leven|zie\s+het\s+(\S+\s+){0,2}niet\s+meer\s+zitten|mezelf\s+(\S+\s+){0,2}(snijden|gesneden|pijn\s+doen|iets\s+aan\s*doen|van\s+kant\s+maken|ophangen)|snij\S*\s+(\S+\s+){0,2}mezelf|einde\s+aan\s+(mijn|m'?n)\s+leven|niemand\s+zou\s+me\s+missen|beter\s+af\s+zonder\s+mij)$re$ $$;
CREATE OR REPLACE FUNCTION public.flag_care() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.needs_care(NEW.body) THEN
    INSERT INTO public.safety_alerts (source, ref_id, author_id, excerpt)
    VALUES (TG_ARGV[0], NEW.id, coalesce(to_jsonb(NEW)->>'author_id', to_jsonb(NEW)->>'sender_id')::uuid, left(NEW.body, 300));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.flag_care() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS flag_care ON public.posts;
CREATE TRIGGER flag_care AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.flag_care('post');
DROP TRIGGER IF EXISTS flag_care ON public.post_comments;
CREATE TRIGGER flag_care AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.flag_care('comment');
DROP TRIGGER IF EXISTS flag_care ON public.direct_messages;
CREATE TRIGGER flag_care AFTER INSERT ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.flag_care('dm');
--> statement-breakpoint
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
--> statement-breakpoint
-- Anonymous numbers for partners. Counts below 5 come back as -1 ("less than 5") so nobody can be recognised.
CREATE OR REPLACE FUNCTION public.impact_stats() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Alleen voor beheerders'; END IF;
  WITH active AS (
    SELECT author_id AS u, created_at FROM public.posts
    UNION ALL SELECT author_id, created_at FROM public.post_comments
    UNION ALL SELECT sender_id, created_at FROM public.direct_messages
    UNION ALL SELECT user_id, created_at FROM public.diary_entries
    UNION ALL SELECT user_id, read_at FROM public.article_reads
    UNION ALL SELECT user_id, care_date::timestamptz FROM public.pet_care
  ),
  s AS (SELECT CASE WHEN n < 5 THEN -1 ELSE n END AS v, k FROM (
    SELECT 'leden' AS k, count(*)::int AS n FROM public.profiles
    UNION ALL SELECT 'nieuw_30d', count(*)::int FROM public.profiles WHERE created_at > now() - interval '30 days'
    UNION ALL SELECT 'actief_7d', count(DISTINCT u)::int FROM active WHERE created_at > now() - interval '7 days'
    UNION ALL SELECT 'actief_30d', count(DISTINCT u)::int FROM active WHERE created_at > now() - interval '30 days'
    UNION ALL SELECT 'band_12_15', count(*)::int FROM public.profiles WHERE age_group = 'junior'
    UNION ALL SELECT 'band_16_25', count(*)::int FROM public.profiles WHERE age_group = 'senior'
    UNION ALL SELECT 'band_26_27', count(*)::int FROM public.profiles WHERE age_group = 'adult'
    UNION ALL SELECT 'gelezen_30d', count(*)::int FROM public.article_reads WHERE read_at > now() - interval '30 days'
    UNION ALL SELECT 'gelezen_totaal', count(*)::int FROM public.article_reads
    UNION ALL SELECT 'reacties_steun', count(*)::int FROM public.article_reactions
    UNION ALL SELECT 'dagboek_30d', count(*)::int FROM public.diary_entries WHERE created_at > now() - interval '30 days'
    UNION ALL SELECT 'groepsberichten_30d', count(*)::int FROM public.posts WHERE created_at > now() - interval '30 days'
    UNION ALL SELECT 'verhalen_ingestuurd', count(*)::int FROM public.story_submissions
    UNION ALL SELECT 'berichten_beheer', count(*)::int FROM public.admin_messages
    UNION ALL SELECT 'zorgsignalen_30d', count(*)::int FROM public.safety_alerts WHERE created_at > now() - interval '30 days'
  ) x)
  SELECT jsonb_build_object(
    'cijfers', (SELECT jsonb_object_agg(k, v) FROM s),
    'onderwerpen', coalesce((
      SELECT jsonb_agg(jsonb_build_object('category', category, 'n', CASE WHEN n < 5 THEN -1 ELSE n END) ORDER BY n DESC)
      FROM (SELECT a.category, count(*)::int AS n FROM public.article_reads r JOIN public.articles a ON a.id = r.article_id
            WHERE r.read_at > now() - interval '90 days' GROUP BY a.category) t), '[]'::jsonb),
    'gemaakt_op', now()
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.impact_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.impact_stats() TO authenticated;
COMMIT;

-- ===== 0065_public_messages =====
-- "Contact" form for people without an account (parents, organisations): anyone may send a message,
-- only admins can read it. A honeypot in the app and a limit here keep spam out.
CREATE TABLE IF NOT EXISTS public.public_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_type text NOT NULL DEFAULT 'anders' CHECK (sender_type IN ('ouder', 'organisatie', 'jongere', 'anders')),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
  email text NOT NULL CHECK (char_length(email) <= 200 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  organisation text CHECK (char_length(organisation) <= 150),
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 5 AND 3000),
  status text NOT NULL DEFAULT 'nieuw' CHECK (status IN ('nieuw', 'afgehandeld')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.public_messages TO anon, authenticated;
GRANT SELECT, UPDATE ON public.public_messages TO authenticated;
GRANT ALL ON public.public_messages TO service_role;
ALTER TABLE public.public_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone sends" ON public.public_messages;
CREATE POLICY "anyone sends" ON public.public_messages FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'nieuw');
DROP POLICY IF EXISTS "admins read" ON public.public_messages;
CREATE POLICY "admins read" ON public.public_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins handle" ON public.public_messages;
CREATE POLICY "admins handle" ON public.public_messages FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
--> statement-breakpoint
-- At most 30 messages per hour in total, so a spam bot cannot flood the inbox.
CREATE OR REPLACE FUNCTION public.public_messages_limit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.public_messages WHERE created_at > now() - interval '1 hour') >= 30 THEN
    RAISE EXCEPTION 'Het is even te druk. Probeer het over een uur opnieuw.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS public_messages_limit ON public.public_messages;
CREATE TRIGGER public_messages_limit BEFORE INSERT ON public.public_messages
  FOR EACH ROW EXECUTE FUNCTION public.public_messages_limit();
--> statement-breakpoint
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
    SELECT 'contact', c.id, left(c.body, 120), c.name || ' · ' || c.sender_type, c.created_at
    FROM public.public_messages c
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
COMMIT;

-- ===== 0066_shop_returns =====
-- Returns in the shop: a member asks for a return within 30 days of ordering, the owner mails the
-- return address, and refunds via Stripe once the package is back. Only the member and the owner see a return.
CREATE TABLE IF NOT EXISTS public.shop_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT '' CHECK (char_length(reason) <= 1000),
  contact_email text NOT NULL CHECK (char_length(contact_email) <= 200),
  status text NOT NULL DEFAULT 'aangevraagd' CHECK (status IN ('aangevraagd', 'adres_gestuurd', 'ontvangen', 'terugbetaald', 'afgewezen')),
  refund_cents integer CHECK (refund_cents >= 0),
  note text CHECK (char_length(note) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_returns TO authenticated;
GRANT ALL ON public.shop_returns TO service_role;
ALTER TABLE public.shop_returns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own returns or owner" ON public.shop_returns;
CREATE POLICY "own returns or owner" ON public.shop_returns FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_owner(auth.uid()));
--> statement-breakpoint
-- Members ask for a return through this check: their own paid order, at most 30 days old, once.
CREATE OR REPLACE FUNCTION public.request_return(_order uuid, _reason text, _email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.shop_orders; new_id uuid;
BEGIN
  SELECT * INTO o FROM public.shop_orders WHERE id = _order AND user_id = auth.uid();
  IF NOT FOUND OR o.kind <> 'paid' THEN RAISE EXCEPTION 'Deze bestelling kun je niet retourneren'; END IF;
  IF o.created_at < now() - interval '30 days' THEN RAISE EXCEPTION 'De retourtermijn is voorbij'; END IF;
  IF coalesce(trim(_email), '') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Vul een geldig e-mailadres in'; END IF;
  INSERT INTO public.shop_returns (order_id, user_id, reason, contact_email)
  VALUES (_order, auth.uid(), left(coalesce(trim(_reason), ''), 1000), trim(_email))
  RETURNING id INTO new_id;
  RETURN new_id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Je hebt voor deze bestelling al een retour aangevraagd';
END $$;
REVOKE ALL ON FUNCTION public.request_return(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_return(uuid, text, text) TO authenticated;
--> statement-breakpoint
-- The owner moves a return along (address sent, received, refused). Refunding itself goes via the server (Stripe).
CREATE OR REPLACE FUNCTION public.set_return_status(_return uuid, _status text, _note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN RAISE EXCEPTION 'Alleen de eigenaar beheert retouren'; END IF;
  IF _status NOT IN ('aangevraagd', 'adres_gestuurd', 'ontvangen', 'afgewezen') THEN RAISE EXCEPTION 'Ongeldige status'; END IF;
  UPDATE public.shop_returns SET status = _status, note = coalesce(_note, note), updated_at = now()
  WHERE id = _return AND status <> 'terugbetaald';
  IF NOT FOUND THEN RAISE EXCEPTION 'Retour niet gevonden of al terugbetaald'; END IF;
  RETURN _return;
END $$;
REVOKE ALL ON FUNCTION public.set_return_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_return_status(uuid, text, text) TO authenticated;
--> statement-breakpoint
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

-- ===== 0067_chat_games =====
-- Mini games in group and private chats (like iMessage games): pool, darts, connect four, tic-tac-toe.
-- A game is started from a chat and shows up there as a message with a game card. Two players take turns;
-- the app computes the rules, the database only lets the player whose turn it is make a move.
CREATE TABLE IF NOT EXISTS public.chat_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game text NOT NULL CHECK (game IN ('pool', 'darten', 'vieropeenrij', 'boterkaaseieren')),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  players uuid[] NOT NULL CHECK (cardinality(players) BETWEEN 1 AND 2),
  turn uuid,
  moves integer NOT NULL DEFAULT 0,
  state jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(state) <= 20000),
  status text NOT NULL DEFAULT 'wacht' CHECK (status IN ('wacht', 'bezig', 'klaar')),
  winner uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((group_id IS NULL) <> (conversation_id IS NULL))
);
CREATE INDEX IF NOT EXISTS chat_games_group_idx ON public.chat_games (group_id);
CREATE INDEX IF NOT EXISTS chat_games_conversation_idx ON public.chat_games (conversation_id);
ALTER TABLE public.chat_games ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.chat_games TO authenticated;
GRANT ALL ON public.chat_games TO service_role;

-- Who may see a game: everyone who can read that chat.
DROP POLICY IF EXISTS "see chat games" ON public.chat_games;
CREATE POLICY "see chat games" ON public.chat_games FOR SELECT TO authenticated USING (
  (group_id IS NOT NULL AND public.can_access_group(group_id))
  OR (conversation_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() IN (c.user_a, c.user_b)))
  OR public.has_role(auth.uid(), 'admin')
);

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS game_id uuid REFERENCES public.chat_games(id) ON DELETE SET NULL;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS game_id uuid REFERENCES public.chat_games(id) ON DELETE SET NULL;

-- Can the current user play along in this chat right now?
CREATE OR REPLACE FUNCTION public.can_play_in(_group uuid, _conv uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _group IS NOT NULL THEN public.is_member(_group) AND public.can_access_group(_group) AND NOT public.is_timed_out(auth.uid())
    ELSE EXISTS (SELECT 1 FROM public.conversations c
      WHERE c.id = _conv AND auth.uid() IN (c.user_a, c.user_b) AND c.status = 'accepted'
        AND public.can_message(public.conv_other(c.id)))
  END
$$;

-- Starts a game and posts it in the chat in one go. In a private chat both people play straight away;
-- in a group the first member who taps "Doe mee" becomes the opponent.
CREATE OR REPLACE FUNCTION public.start_chat_game(_game text, _group uuid, _conv uuid, _state jsonb, _body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  g public.chat_games;
  msg uuid;
BEGIN
  IF me IS NULL OR (_group IS NULL) = (_conv IS NULL) OR NOT public.can_play_in(_group, _conv) THEN
    RAISE EXCEPTION 'Je kunt in deze chat geen spelletje starten.';
  END IF;
  IF _group IS NOT NULL THEN
    INSERT INTO public.chat_games (game, group_id, created_by, players, state)
    VALUES (_game, _group, me, ARRAY[me], coalesce(_state, '{}'::jsonb)) RETURNING * INTO g;
    INSERT INTO public.posts (group_id, author_id, body, game_id)
    VALUES (_group, me, left(_body, 2000), g.id) RETURNING id INTO msg;
  ELSE
    INSERT INTO public.chat_games (game, conversation_id, created_by, players, turn, status, state)
    VALUES (_game, _conv, me, ARRAY[me, public.conv_other(_conv)], me, 'bezig', coalesce(_state, '{}'::jsonb)) RETURNING * INTO g;
    INSERT INTO public.direct_messages (conversation_id, sender_id, body, game_id)
    VALUES (_conv, me, left(_body, 2000), g.id) RETURNING id INTO msg;
  END IF;
  RETURN jsonb_build_object('game_id', g.id, 'message_id', msg);
END $$;

-- Joins an open group game as the second player; whoever started it goes first.
CREATE OR REPLACE FUNCTION public.join_chat_game(_game uuid)
RETURNS public.chat_games LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  g public.chat_games;
BEGIN
  SELECT * INTO g FROM public.chat_games WHERE id = _game FOR UPDATE;
  IF g.id IS NULL OR g.status <> 'wacht' OR me = ANY (g.players) OR NOT public.can_play_in(g.group_id, g.conversation_id) THEN
    RAISE EXCEPTION 'Meedoen lukt niet (meer): misschien was iemand je net voor.';
  END IF;
  UPDATE public.chat_games SET players = players || me, turn = created_by, status = 'bezig', updated_at = now()
  WHERE id = _game RETURNING * INTO g;
  RETURN g;
END $$;

-- One move. `_moves` is the number of moves the player saw, so a double tap or an old screen cannot
-- play twice. `_again`: the same player goes again (pool). `_winner`: 0 or 1 (index in players) or null for a draw.
CREATE OR REPLACE FUNCTION public.chat_game_move(_game uuid, _moves integer, _state jsonb, _again boolean, _finished boolean, _winner integer)
RETURNS public.chat_games LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  g public.chat_games;
BEGIN
  SELECT * INTO g FROM public.chat_games WHERE id = _game FOR UPDATE;
  IF g.id IS NULL OR g.status <> 'bezig' OR g.turn IS DISTINCT FROM me THEN
    RAISE EXCEPTION 'Je bent nu niet aan de beurt.';
  END IF;
  IF g.moves <> _moves THEN
    RAISE EXCEPTION 'Het spel is net veranderd. Kijk opnieuw.';
  END IF;
  IF NOT public.can_play_in(g.group_id, g.conversation_id) THEN
    RAISE EXCEPTION 'Je kunt in deze chat nu niet spelen.';
  END IF;
  UPDATE public.chat_games SET
    state = _state,
    moves = moves + 1,
    status = CASE WHEN _finished THEN 'klaar' ELSE 'bezig' END,
    winner = CASE WHEN _finished AND _winner IN (0, 1) THEN players[_winner + 1] END,
    turn = CASE WHEN _finished THEN NULL WHEN _again THEN me
                ELSE (SELECT p FROM unnest(players) p WHERE p <> me LIMIT 1) END,
    updated_at = now()
  WHERE id = _game RETURNING * INTO g;
  RETURN g;
END $$;

-- Stop: the starter can cancel an open game; a player can give up (the other one wins).
CREATE OR REPLACE FUNCTION public.stop_chat_game(_game uuid)
RETURNS public.chat_games LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  g public.chat_games;
BEGIN
  SELECT * INTO g FROM public.chat_games WHERE id = _game FOR UPDATE;
  IF g.id IS NULL OR g.status = 'klaar' OR NOT (me = ANY (g.players)) THEN
    RAISE EXCEPTION 'Dit spel kun je niet stoppen.';
  END IF;
  UPDATE public.chat_games SET status = 'klaar', turn = NULL,
    winner = (SELECT p FROM unnest(players) p WHERE p <> me LIMIT 1), updated_at = now()
  WHERE id = _game RETURNING * INTO g;
  RETURN g;
END $$;

REVOKE ALL ON FUNCTION public.can_play_in(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.start_chat_game(text, uuid, uuid, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_chat_game(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.chat_game_move(uuid, integer, jsonb, boolean, boolean, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.stop_chat_game(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_play_in(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_chat_game(text, uuid, uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_chat_game(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_game_move(uuid, integer, jsonb, boolean, boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.stop_chat_game(uuid) TO authenticated;

-- Live: a move shows up straight away for the other player.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_games') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_games;
  END IF;
END $$;

-- ===== 0068_chat_game_ludo =====
-- Mens erger je niet as a chat game.
ALTER TABLE public.chat_games DROP CONSTRAINT IF EXISTS chat_games_game_check;
ALTER TABLE public.chat_games ADD CONSTRAINT chat_games_game_check
  CHECK (game IN ('pool', 'darten', 'vieropeenrij', 'boterkaaseieren', 'mensergerjeniet'));

-- ===== 0069_chat_game_chess_draughts =====
-- Chess and draughts as chat games.
ALTER TABLE public.chat_games DROP CONSTRAINT IF EXISTS chat_games_game_check;
ALTER TABLE public.chat_games ADD CONSTRAINT chat_games_game_check
  CHECK (game IN ('pool', 'darten', 'vieropeenrij', 'boterkaaseieren', 'mensergerjeniet', 'schaken', 'dammen'));

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

-- ===== 0071_fun_features =====
-- Fun and wellbeing features: emoji reactions, polls and Riti stickers in chats, a private mood calendar,
-- an anonymous compliment wall, a weekly group challenge and badges.

-- ===== Emoji reactions: one per member per message, like iMessage tapbacks =====
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('❤️', '😂', '😮', '😢', '👍', '🙏')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((post_id IS NULL) <> (message_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS message_reactions_post_user ON public.message_reactions (post_id, user_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS message_reactions_dm_user ON public.message_reactions (message_id, user_id) WHERE message_id IS NOT NULL;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;

-- Can the current user read (and react to) this private message?
CREATE OR REPLACE FUNCTION public.can_see_dm(_message uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.direct_messages m JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = _message AND auth.uid() IN (c.user_a, c.user_b) AND c.status = 'accepted')
$$;
REVOKE ALL ON FUNCTION public.can_see_dm(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_see_dm(uuid) TO authenticated;

DROP POLICY IF EXISTS "see reactions" ON public.message_reactions;
CREATE POLICY "see reactions" ON public.message_reactions FOR SELECT TO authenticated USING (
  (post_id IS NOT NULL AND public.can_access_group(public.post_group(post_id)))
  OR (message_id IS NOT NULL AND public.can_see_dm(message_id))
);
DROP POLICY IF EXISTS "react" ON public.message_reactions;
CREATE POLICY "react" ON public.message_reactions FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND NOT public.is_timed_out(auth.uid()) AND (
    (post_id IS NOT NULL AND public.is_member(public.post_group(post_id)) AND public.can_access_group(public.post_group(post_id)))
    OR (message_id IS NOT NULL AND public.can_see_dm(message_id)))
);
DROP POLICY IF EXISTS "change own reaction" ON public.message_reactions;
CREATE POLICY "change own reaction" ON public.message_reactions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "remove own reaction" ON public.message_reactions;
CREATE POLICY "remove own reaction" ON public.message_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ===== Polls in group chats =====
CREATE TABLE IF NOT EXISTS public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question text NOT NULL CHECK (char_length(question) BETWEEN 3 AND 140),
  options text[] NOT NULL CHECK (cardinality(options) BETWEEN 2 AND 6),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.poll_votes (
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option smallint NOT NULL CHECK (option >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)
);
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.polls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_votes TO authenticated;
GRANT ALL ON public.polls, public.poll_votes TO service_role;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS poll_id uuid REFERENCES public.polls(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "see polls" ON public.polls;
CREATE POLICY "see polls" ON public.polls FOR SELECT TO authenticated USING (public.can_access_group(group_id));
DROP POLICY IF EXISTS "see votes" ON public.poll_votes;
CREATE POLICY "see votes" ON public.poll_votes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.polls p WHERE p.id = poll_id AND public.can_access_group(p.group_id)));
DROP POLICY IF EXISTS "vote" ON public.poll_votes;
CREATE POLICY "vote" ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND NOT public.is_timed_out(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.polls p WHERE p.id = poll_id AND option < cardinality(p.options)
      AND public.is_member(p.group_id) AND public.can_access_group(p.group_id))
);
DROP POLICY IF EXISTS "change vote" ON public.poll_votes;
CREATE POLICY "change vote" ON public.poll_votes FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.polls p WHERE p.id = poll_id AND option < cardinality(p.options)));
DROP POLICY IF EXISTS "remove vote" ON public.poll_votes;
CREATE POLICY "remove vote" ON public.poll_votes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Makes a poll and posts it in the group in one go.
CREATE OR REPLACE FUNCTION public.create_poll(_group uuid, _question text, _options text[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  q text := btrim(coalesce(_question, ''));
  opts text[];
  pid uuid;
BEGIN
  IF me IS NULL OR NOT public.is_member(_group) OR NOT public.can_access_group(_group) OR public.is_timed_out(me) THEN
    RAISE EXCEPTION 'Je kunt in deze groep geen peiling maken.';
  END IF;
  SELECT array_agg(left(btrim(o), 60)) INTO opts FROM unnest(_options) o WHERE btrim(o) <> '';
  IF char_length(q) < 3 OR char_length(q) > 140 OR coalesce(cardinality(opts), 0) NOT BETWEEN 2 AND 6 THEN
    RAISE EXCEPTION 'Een peiling heeft een vraag en 2 tot 6 antwoorden.';
  END IF;
  INSERT INTO public.polls (group_id, created_by, question, options) VALUES (_group, me, q, opts) RETURNING id INTO pid;
  INSERT INTO public.posts (group_id, author_id, body, poll_id) VALUES (_group, me, '📊 ' || q, pid);
  RETURN pid;
END $$;
REVOKE ALL ON FUNCTION public.create_poll(uuid, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_poll(uuid, text, text[]) TO authenticated;

-- ===== Riti stickers in chats =====
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS sticker text;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS sticker text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_sticker_check') THEN
    ALTER TABLE public.posts ADD CONSTRAINT posts_sticker_check CHECK (sticker IS NULL OR sticker ~ '^[a-z]{2,20}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'direct_messages_sticker_check') THEN
    ALTER TABLE public.direct_messages ADD CONSTRAINT direct_messages_sticker_check CHECK (sticker IS NULL OR sticker ~ '^[a-z]{2,20}$');
  END IF;
END $$;

-- ===== Mood calendar: private, only you see your own days =====
CREATE TABLE IF NOT EXISTS public.mood_entries (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day date NOT NULL,
  mood text NOT NULL CHECK (mood IN ('super', 'goed', 'gaat-wel', 'verdrietig', 'gestrest')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mood_entries TO authenticated;
GRANT ALL ON public.mood_entries TO service_role;
DROP POLICY IF EXISTS "own moods" ON public.mood_entries;
CREATE POLICY "own moods" ON public.mood_entries FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND day BETWEEN current_date - 1 AND current_date + 1);

-- ===== Compliment wall: kind compliments from a fixed list, the receiver never sees who sent it =====
CREATE TABLE IF NOT EXISTS public.compliments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  compliment smallint NOT NULL CHECK (compliment BETWEEN 1 AND 24),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_id <> to_id)
);
CREATE INDEX IF NOT EXISTS compliments_to_idx ON public.compliments (to_id, created_at DESC);
ALTER TABLE public.compliments ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.compliments TO authenticated;
GRANT ALL ON public.compliments TO service_role;
-- Only admins read the table itself; members get their own compliments without the sender through my_compliments().
DROP POLICY IF EXISTS "admins see compliments" ON public.compliments;
CREATE POLICY "admins see compliments" ON public.compliments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.send_compliment(_to uuid, _compliment integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL OR public.is_timed_out(me) OR NOT public.can_message(_to) THEN
    RAISE EXCEPTION 'Je kunt deze persoon geen compliment sturen.';
  END IF;
  IF _compliment NOT BETWEEN 1 AND 24 THEN
    RAISE EXCEPTION 'Kies een compliment uit de lijst.';
  END IF;
  IF (SELECT count(*) FROM public.compliments WHERE from_id = me AND created_at > now() - interval '1 day') >= 10 THEN
    RAISE EXCEPTION 'Je hebt vandaag al 10 complimenten gestuurd. Morgen weer!';
  END IF;
  IF EXISTS (SELECT 1 FROM public.compliments WHERE from_id = me AND to_id = _to AND created_at > now() - interval '1 day') THEN
    RAISE EXCEPTION 'Je hebt deze persoon vandaag al een compliment gestuurd.';
  END IF;
  INSERT INTO public.compliments (from_id, to_id, compliment) VALUES (me, _to, _compliment::smallint);
END $$;

CREATE OR REPLACE FUNCTION public.my_compliments()
RETURNS TABLE (id uuid, compliment smallint, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.compliment, c.created_at FROM public.compliments c
  WHERE c.to_id = auth.uid() ORDER BY c.created_at DESC LIMIT 200
$$;
REVOKE ALL ON FUNCTION public.send_compliment(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_compliments() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_compliment(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_compliments() TO authenticated;

-- ===== Weekly group challenge: members tick off a shared goal; at 15 ticks everyone who helped gets 30 XP =====
CREATE TABLE IF NOT EXISTS public.group_challenge_checkins (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT current_date,
  PRIMARY KEY (group_id, user_id, day)
);
CREATE TABLE IF NOT EXISTS public.group_challenge_claims (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week date NOT NULL,
  PRIMARY KEY (group_id, user_id, week)
);
ALTER TABLE public.group_challenge_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_challenge_claims ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.group_challenge_checkins, public.group_challenge_claims TO authenticated;
GRANT ALL ON public.group_challenge_checkins, public.group_challenge_claims TO service_role;
DROP POLICY IF EXISTS "see checkins" ON public.group_challenge_checkins;
CREATE POLICY "see checkins" ON public.group_challenge_checkins FOR SELECT TO authenticated USING (public.can_access_group(group_id));
DROP POLICY IF EXISTS "see own claims" ON public.group_challenge_claims;
CREATE POLICY "see own claims" ON public.group_challenge_claims FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.checkin_group_challenge(_group uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_member(_group) OR NOT public.can_access_group(_group) OR public.is_timed_out(auth.uid()) THEN
    RAISE EXCEPTION 'Je kunt in deze groep niet meedoen.';
  END IF;
  INSERT INTO public.group_challenge_checkins (group_id, user_id) VALUES (_group, auth.uid()) ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.claim_group_challenge(_group uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  wk date := date_trunc('week', current_date)::date;
BEGIN
  IF NOT public.is_member(_group) OR NOT public.can_access_group(_group) THEN RETURN 0; END IF;
  IF (SELECT count(*) FROM public.group_challenge_checkins WHERE group_id = _group AND day >= wk) < 15 THEN RETURN 0; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.group_challenge_checkins WHERE group_id = _group AND user_id = auth.uid() AND day >= wk) THEN RETURN 0; END IF;
  INSERT INTO public.group_challenge_claims (group_id, user_id, week) VALUES (_group, auth.uid(), wk) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN 0; END IF;
  UPDATE public.pets SET xp = xp + 30 WHERE user_id = auth.uid();
  RETURN 30;
END $$;
REVOKE ALL ON FUNCTION public.checkin_group_challenge(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_group_challenge(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkin_group_challenge(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_group_challenge(uuid) TO authenticated;

-- ===== Badges: counts about yourself only; the app decides which badges they earn =====
CREATE OR REPLACE FUNCTION public.my_badge_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'stories', (SELECT count(*) FROM public.story_submissions WHERE user_id = auth.uid()),
    'diary', (SELECT count(*) FROM public.diary_entries WHERE user_id = auth.uid()),
    'moods', (SELECT count(*) FROM public.mood_entries WHERE user_id = auth.uid()),
    'games_won', (SELECT count(*) FROM public.chat_games WHERE winner = auth.uid()),
    'compliments_sent', (SELECT count(*) FROM public.compliments WHERE from_id = auth.uid()),
    'compliments_received', (SELECT count(*) FROM public.compliments WHERE to_id = auth.uid()),
    'challenges', (SELECT count(*) FROM public.group_challenge_claims WHERE user_id = auth.uid()),
    'groups_made', (SELECT count(*) FROM public.groups WHERE created_by = auth.uid()),
    'pet_xp', coalesce((SELECT xp FROM public.pets WHERE user_id = auth.uid()), 0)
  )
$$;
REVOKE ALL ON FUNCTION public.my_badge_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_badge_stats() TO authenticated;

-- Live: reactions, votes and challenge ticks show up straight away.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['message_reactions', 'poll_votes', 'group_challenge_checkins'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- ===== 0072_music_books =====
-- Music and books. Admins add playlists (Spotify, YouTube or Apple Music) and book tips, each with a
-- minimum age. Members share song tips with their own age band and like them, and keep a private
-- bookshelf (want to read / reading / read) with star ratings; others only see the average.

-- Only links to these music services are allowed (the app turns them into a player).
CREATE OR REPLACE FUNCTION public.is_music_url(_url text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT _url ~ '^https://(open\.spotify\.com|(www\.|music\.)?youtube\.com|youtu\.be|music\.apple\.com)/[A-Za-z0-9/_?=&.%-]+$'
    AND char_length(_url) <= 300
$$;

CREATE TABLE IF NOT EXISTS public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 60),
  emoji text NOT NULL DEFAULT '🎵' CHECK (char_length(emoji) <= 8),
  description text CHECK (char_length(description) <= 200),
  url text NOT NULL CHECK (public.is_music_url(url)),
  min_age integer NOT NULL DEFAULT 12 CHECK (min_age IN (12, 16)),
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  author text NOT NULL CHECK (char_length(author) BETWEEN 1 AND 120),
  description text CHECK (char_length(description) <= 600),
  theme text CHECK (char_length(theme) <= 40),
  isbn text CHECK (isbn ~ '^[0-9]{10}([0-9]{3})?$'),
  min_age integer NOT NULL DEFAULT 12 CHECK (min_age IN (12, 16)),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlists, public.books TO authenticated;
GRANT ALL ON public.playlists, public.books TO service_role;
DROP POLICY IF EXISTS "see playlists for my age" ON public.playlists;
CREATE POLICY "see playlists for my age" ON public.playlists FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR coalesce(public.my_age(), 0) >= min_age);
DROP POLICY IF EXISTS "admins manage playlists" ON public.playlists;
CREATE POLICY "admins manage playlists" ON public.playlists FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "see books for my age" ON public.books;
CREATE POLICY "see books for my age" ON public.books FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR coalesce(public.my_age(), 0) >= min_age);
DROP POLICY IF EXISTS "admins manage books" ON public.books;
CREATE POLICY "admins manage books" ON public.books FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Your own bookshelf: nobody else sees it.
CREATE TABLE IF NOT EXISTS public.book_shelf (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('wil-lezen', 'aan-het-lezen', 'gelezen')),
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id)
);
ALTER TABLE public.book_shelf ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_shelf TO authenticated;
GRANT ALL ON public.book_shelf TO service_role;
DROP POLICY IF EXISTS "own shelf" ON public.book_shelf;
CREATE POLICY "own shelf" ON public.book_shelf FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Average stars per book without showing who gave them.
CREATE OR REPLACE FUNCTION public.book_ratings()
RETURNS TABLE (book_id uuid, average numeric, ratings integer, readers integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, round(avg(s.rating), 1), count(s.rating)::int, count(s.user_id) FILTER (WHERE s.status = 'gelezen')::int
  FROM public.books b JOIN public.book_shelf s ON s.book_id = b.id
  WHERE public.has_role(auth.uid(), 'admin') OR coalesce(public.my_age(), 0) >= b.min_age
  GROUP BY b.id
$$;
REVOKE ALL ON FUNCTION public.book_ratings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_ratings() TO authenticated;

-- Song tips from members, only visible within their own age band.
CREATE TABLE IF NOT EXISTS public.song_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  artist text NOT NULL CHECK (char_length(artist) BETWEEN 1 AND 80),
  url text CHECK (url IS NULL OR public.is_music_url(url)),
  age_group public.age_group NOT NULL,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS song_tips_band_idx ON public.song_tips (age_group, created_at DESC);
CREATE TABLE IF NOT EXISTS public.song_tip_likes (
  tip_id uuid NOT NULL REFERENCES public.song_tips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (tip_id, user_id)
);
ALTER TABLE public.song_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_tip_likes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, DELETE ON public.song_tips TO authenticated;
GRANT UPDATE (hidden) ON public.song_tips TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.song_tip_likes TO authenticated;
GRANT ALL ON public.song_tips, public.song_tip_likes TO service_role;

CREATE OR REPLACE FUNCTION public.can_see_song_tip(_tip uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.song_tips t WHERE t.id = _tip AND (
    public.has_role(auth.uid(), 'admin') OR t.user_id = auth.uid()
    OR (NOT t.hidden AND public.can_use_community() AND t.age_group = public.my_age_group())))
$$;
REVOKE ALL ON FUNCTION public.can_see_song_tip(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_see_song_tip(uuid) TO authenticated;

DROP POLICY IF EXISTS "see song tips" ON public.song_tips;
CREATE POLICY "see song tips" ON public.song_tips FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR user_id = auth.uid()
  OR (NOT hidden AND public.can_use_community() AND age_group = public.my_age_group()));
DROP POLICY IF EXISTS "remove own song tip" ON public.song_tips;
CREATE POLICY "remove own song tip" ON public.song_tips FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins hide song tips" ON public.song_tips;
CREATE POLICY "admins hide song tips" ON public.song_tips FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "see likes" ON public.song_tip_likes;
CREATE POLICY "see likes" ON public.song_tip_likes FOR SELECT TO authenticated USING (public.can_see_song_tip(tip_id));
DROP POLICY IF EXISTS "like" ON public.song_tip_likes;
CREATE POLICY "like" ON public.song_tip_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_see_song_tip(tip_id));
DROP POLICY IF EXISTS "unlike" ON public.song_tip_likes;
CREATE POLICY "unlike" ON public.song_tip_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Shares a song tip with your own age band (at most 5 a day).
CREATE OR REPLACE FUNCTION public.add_song_tip(_title text, _artist text, _url text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
  band public.age_group;
  u text := nullif(btrim(coalesce(_url, '')), '');
  tid uuid;
BEGIN
  IF me IS NULL OR NOT public.can_use_community() OR public.is_timed_out(me) THEN
    RAISE EXCEPTION 'Je kunt nu geen liedje delen.';
  END IF;
  SELECT age_group INTO band FROM public.profiles WHERE id = me AND birthdate IS NOT NULL;
  IF band IS NULL THEN RAISE EXCEPTION 'Vul eerst je geboortedatum in.'; END IF;
  IF u IS NOT NULL AND NOT public.is_music_url(u) THEN
    RAISE EXCEPTION 'Gebruik een link van Spotify, YouTube of Apple Music (of laat de link leeg).';
  END IF;
  IF (SELECT count(*) FROM public.song_tips WHERE user_id = me AND created_at > now() - interval '1 day') >= 5 THEN
    RAISE EXCEPTION 'Je hebt vandaag al 5 liedjes gedeeld. Morgen weer!';
  END IF;
  INSERT INTO public.song_tips (user_id, title, artist, url, age_group)
  VALUES (me, left(btrim(_title), 80), left(btrim(_artist), 80), u, band) RETURNING id INTO tid;
  RETURN tid;
END $$;
REVOKE ALL ON FUNCTION public.add_song_tip(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_song_tip(text, text, text) TO authenticated;

-- A few book tips to start with (admins can change or remove them).
INSERT INTO public.books (title, author, description, theme, min_age)
SELECT * FROM (VALUES
  ('Wonder', 'R.J. Palacio', 'August ziet er anders uit dan andere kinderen en gaat voor het eerst naar een gewone school. Een boek over vriendschap, pesten en lief zijn voor elkaar.', 'Vriendschap', 12),
  ('Het Achterhuis', 'Anne Frank', 'Het echte dagboek van Anne Frank, die zich in de Tweede Wereldoorlog met haar familie verstopte in Amsterdam.', 'Dagboek', 12),
  ('Eleanor & Park', 'Rainbow Rowell', 'Twee tieners die zich allebei een buitenbeentje voelen, leren elkaar kennen in de schoolbus.', 'Liefde', 16),
  ('Turtles All the Way Down', 'John Green', 'Aza leeft met angst en dwanggedachten en probeert ondertussen een mysterie op te lossen. Een eerlijk verhaal over hoe het voelt om vast te zitten in je hoofd.', 'Angst', 16)
) AS v(title, author, description, theme, min_age)
WHERE NOT EXISTS (SELECT 1 FROM public.books);

-- ===== 0073_remove_books =====
-- Books are taken out of the app again (music stays).
DROP FUNCTION IF EXISTS public.book_ratings();
DROP TABLE IF EXISTS public.book_shelf;
DROP TABLE IF EXISTS public.books;
COMMIT;
