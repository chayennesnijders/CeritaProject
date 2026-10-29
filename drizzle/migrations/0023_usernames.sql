ALTER TABLE public.profiles ADD COLUMN username text CHECK (username ~ '^[a-z0-9_.]{3,20}$');
CREATE UNIQUE INDEX profiles_username_unique ON public.profiles (lower(username));