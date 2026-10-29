ALTER TABLE public.posts ADD COLUMN mentions uuid[] NOT NULL DEFAULT '{}';
COMMENT ON COLUMN public.posts.mentions IS 'User ids mentioned with @username in the post body.';