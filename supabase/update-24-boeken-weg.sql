-- Update na update-23: het boekengedeelte gaat er weer uit (muziek blijft).
-- Plak dit in Supabase → SQL Editor → New query → Run. Heb je update-23 nog niet gedaan? Dan mag je deze ook gewoon plakken.

-- ===== 0073_remove_books =====
-- Books are taken out of the app again (music stays).
DROP FUNCTION IF EXISTS public.book_ratings();
DROP TABLE IF EXISTS public.book_shelf;
DROP TABLE IF EXISTS public.books;
