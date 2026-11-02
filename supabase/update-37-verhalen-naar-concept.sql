-- Update 37: alle verhalen die nu in de app staan, terug naar concept.
-- Ze verdwijnen voor leden uit Ontdekken en komen bij Beheer -> Verhalen ->
-- "Klaar om in te plannen". Er wordt niets verwijderd: reacties en bewaard blijven bewaard.
-- Artikelen (geen verhalen) blijven gewoon staan.
-- Foto's staan voortaan alleen nog als banner bovenaan: heeft een verhaal nog geen banner,
-- dan wordt de eerste foto uit de tekst de banner.

BEGIN;

UPDATE public.articles
SET image_url = substring(body FROM '\[\[foto:([^\]]+)\]\]')
WHERE kind = 'verhaal'
  AND image_url IS NULL
  AND body ~ '\[\[foto:';

UPDATE public.articles
SET is_published = false
WHERE kind = 'verhaal'
  AND is_published = true;

COMMIT;

-- Het lijstje van alle verhalen (stuur dit naar Claude, dan worden dubbele verhalen
-- uit je notities niet nog een keer toegevoegd). Tik onder de uitkomst op "Download CSV".
SELECT title AS titel,
       left(regexp_replace(regexp_replace(body, '\[\[foto:[^\]]+\]\]', '', 'g'), '\s+', ' ', 'g'), 120) AS begin_van_het_verhaal
FROM public.articles
WHERE kind = 'verhaal'
ORDER BY created_at;
