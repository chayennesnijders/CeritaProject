BEGIN;

CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  summary text NOT NULL DEFAULT '' CHECK (length(summary) <= 1000),
  audience text NOT NULL DEFAULT 'Klas 1 t/m 3' CHECK (length(audience) <= 60),
  minutes int NOT NULL DEFAULT 50 CHECK (minutes BETWEEN 5 AND 300),
  theme text NOT NULL DEFAULT '' CHECK (length(theme) <= 60),
  emoji text NOT NULL DEFAULT '📘' CHECK (length(emoji) <= 16),
  is_free boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT false,
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lesson_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (length(label) BETWEEN 1 AND 80),
  path text NOT NULL CHECK (length(path) <= 300),
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lesson_files_lesson ON public.lesson_files (lesson_id, sort);

CREATE TABLE IF NOT EXISTS public.school_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school text NOT NULL CHECK (length(school) BETWEEN 1 AND 120),
  contact text NOT NULL DEFAULT '' CHECK (length(contact) <= 200),
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  valid_until date NOT NULL,
  active boolean NOT NULL DEFAULT true,
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lesson_downloads (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  file_id uuid REFERENCES public.lesson_files(id) ON DELETE SET NULL,
  license_id uuid REFERENCES public.school_licenses(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lesson_downloads_license ON public.lesson_downloads (license_id, created_at);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins beheren lessen" ON public.lessons;
CREATE POLICY "admins beheren lessen" ON public.lessons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins beheren lesbestanden" ON public.lesson_files;
CREATE POLICY "admins beheren lesbestanden" ON public.lesson_files FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins beheren schoollicenties" ON public.school_licenses;
CREATE POLICY "admins beheren schoollicenties" ON public.school_licenses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins lezen downloads" ON public.lesson_downloads;
CREATE POLICY "admins lezen downloads" ON public.lesson_downloads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

REVOKE ALL ON public.lessons, public.lesson_files, public.school_licenses, public.lesson_downloads FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons, public.lesson_files, public.school_licenses TO authenticated;
GRANT SELECT ON public.lesson_downloads TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('lessons', 'lessons', false, 104857600, ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4', 'image/png', 'image/jpeg'
  ])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS "admins lezen lesbestanden" ON storage.objects;
CREATE POLICY "admins lezen lesbestanden" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lessons' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins uploaden lesbestanden" ON storage.objects;
CREATE POLICY "admins uploaden lesbestanden" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lessons' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins verwijderen lesbestanden" ON storage.objects;
CREATE POLICY "admins verwijderen lesbestanden" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lessons' AND public.has_role(auth.uid(), 'admin'));

COMMIT;
