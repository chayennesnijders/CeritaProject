-- Maak jezelf beheerder (admin) én eigenaar (owner) van CeritaProject.
-- 1. Vervang JOUW-EMAIL hieronder door het e-mailadres waarmee je inlogt in de app.
-- 2. Plak dit in Supabase → SQL Editor → New query → Run.
-- Je ziet daarna je naam met de rollen admin en owner. Zie je niks? Dan klopt het e-mailadres niet.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, r.role
FROM auth.users u
CROSS JOIN (VALUES ('admin'::public.app_role), ('owner'::public.app_role)) AS r(role)
WHERE lower(u.email) = lower('JOUW-EMAIL')
ON CONFLICT (user_id, role) DO NOTHING;

SELECT p.display_name, u.email, string_agg(ur.role::text, ', ') AS rollen
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE lower(u.email) = lower('JOUW-EMAIL')
GROUP BY p.display_name, u.email;
