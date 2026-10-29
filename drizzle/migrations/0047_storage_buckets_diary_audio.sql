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
--> statement-breakpoint
ALTER TABLE public.diary_entries ADD COLUMN IF NOT EXISTS audio_path text;
--> statement-breakpoint
DROP POLICY IF EXISTS "own diary audio read" ON storage.objects;
DROP POLICY IF EXISTS "own diary audio write" ON storage.objects;
DROP POLICY IF EXISTS "own diary audio delete" ON storage.objects;
CREATE POLICY "own diary audio read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'diary-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own diary audio write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'diary-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own diary audio delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'diary-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
