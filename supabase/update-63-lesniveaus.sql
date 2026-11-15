-- Update na update-62: leraren kiezen voor welke groep(en) ze lesgeven (groep 7/8, klas 1 t/m 3,
-- klas 4 t/m 6) en zien dan alleen de lessen die daarbij horen.
-- Plak dit in Supabase → SQL Editor en klik Run. Je kunt het veilig vaker draaien.

ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS levels text[] NOT NULL DEFAULT '{}';

-- Alleen de leraar zelf zet zijn keuze, en alleen geldige groepen.
CREATE OR REPLACE FUNCTION public.set_teacher_levels(_levels text[])
RETURNS text[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  clean text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Log eerst in.';
  END IF;
  SELECT coalesce(array_agg(DISTINCT l ORDER BY l), '{}') INTO clean
    FROM unnest(coalesce(_levels, '{}')) AS l
   WHERE l IN ('groep78', 'klas13', 'klas46');
  UPDATE public.teachers SET levels = clean WHERE user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dit kan alleen met een leraar-account.';
  END IF;
  RETURN clean;
END $$;
REVOKE ALL ON FUNCTION public.set_teacher_levels(text[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_teacher_levels(text[]) TO authenticated;
