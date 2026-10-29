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