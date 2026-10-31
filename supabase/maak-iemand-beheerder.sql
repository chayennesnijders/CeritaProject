-- Maak iemand anders beheerder (admin) van CeritaProject, op gebruikersnaam.
-- 1. Zet de gebruikersnaam (zonder @) hieronder bij GEBRUIKERSNAAM. Nu staat er: anouk
-- 2. Plak dit in Supabase → SQL Editor → New query → Run.
-- Onderaan zie je de naam met de rol admin. Zie je niks? Dan bestaat die gebruikersnaam niet:
-- kijk in de app bij haar profiel hoe hij precies is.
-- Ze wordt alleen beheerder (admin), geen eigenaar (owner).
WITH target AS (
  SELECT id FROM public.profiles WHERE lower(username) = lower('anouk')
)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM target
ON CONFLICT (user_id, role) DO NOTHING;

SELECT p.display_name, '@' || p.username AS gebruikersnaam, string_agg(ur.role::text, ', ') AS rollen
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id
WHERE lower(p.username) = lower('anouk')
GROUP BY p.display_name, p.username;
