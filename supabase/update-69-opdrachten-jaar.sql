-- Update na update-68: opdrachten krijgen een startdatum, zodat ambassadeurs alleen de opdrachten van
-- deze week zien (niet alles tegelijk). Plus een jaar lang 2 opdrachten per week, vanaf 16 november 2026.
-- Plak dit in Supabase → SQL Editor en klik Run. Je kunt het veilig vaker draaien (niks komt dubbel).

ALTER TABLE public.ambassador_tasks ADD COLUMN IF NOT EXISTS starts date;
CREATE INDEX IF NOT EXISTS ambassador_tasks_starts ON public.ambassador_tasks (starts);

-- Ambassadors only see active assignments whose week has started (Dutch time).
DROP POLICY IF EXISTS "ambassadeurs zien opdrachten" ON public.ambassador_tasks;
CREATE POLICY "ambassadeurs zien opdrachten" ON public.ambassador_tasks FOR SELECT TO authenticated
  USING ((active AND public.is_ambassador(auth.uid())
          AND (starts IS NULL OR starts <= (now() AT TIME ZONE 'Europe/Amsterdam')::date))
         OR public.has_role(auth.uid(), 'admin'));

INSERT INTO public.ambassador_tasks (title, body, points, starts, due)
SELECT v.title, v.body, v.points, v.starts, v.due FROM (VALUES
  ('Vertel waarom je ambassadeur bent', 'Maak een korte video of post: waarom doe jij mee met CeritaProject? Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2026-11-16', DATE '2026-11-22'),
  ('Zet je link in je bio', 'Zet je eigen link in je TikTok- of Instagram-bio en stuur de link naar je profiel in.', 2, DATE '2026-11-16', DATE '2026-11-22'),
  ('Herkenning: ‘het gaat goed’', 'Maak een post over dingen die je doet als je ‘het gaat goed’ zegt terwijl dat niet zo is. Sluit af met: je bent niet de enige. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2026-11-23', DATE '2026-11-29'),
  ('Deel je link in je story', 'Zet je link in je story met een zin in je eigen woorden. Stuur een screenshot of link in.', 2, DATE '2026-11-23', DATE '2026-11-29'),
  ('Laat je favoriete functie zien', 'Film 15 seconden van je favoriete plek in de app, bijvoorbeeld je dagboek of je diertje. Laat geen namen of berichten van andere leden zien. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2026-11-30', DATE '2026-12-06'),
  ('QR-code in je WhatsApp-status', 'Download je QR-code in het portaal en zet hem in je WhatsApp-status. Stuur een screenshot in.', 2, DATE '2026-11-30', DATE '2026-12-06'),
  ('December is niet voor iedereen leuk', 'Maak een post over dat de feestdagen niet voor iedereen fijn zijn, en dat dat oké is. Zet de Kindertelefoon (0800-0432) en 113 (0800-0113) erbij. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2026-12-07', DATE '2026-12-13'),
  ('Flyer op je school of studie', 'Print je flyer en hang hem op je eigen mbo, hbo of uni. Alleen als het mag van de plek, en niet op basisscholen. Stuur een foto in (zonder herkenbare mensen).', 5, DATE '2026-12-07', DATE '2026-12-13'),
  ('Wat helpt als je je alleen voelt', 'Maak een slideshow met kleine dingen die jou helpen als je je alleen voelt. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2026-12-14', DATE '2026-12-20'),
  ('Welke beloning wil jij halen?', 'Vertel in je story welk level je wil halen en zet je link erbij.', 2, DATE '2026-12-14', DATE '2026-12-20'),
  ('Een berichtje voor de kerstdagen', 'Maak een post voor wie zich deze dagen alleen voelt. Kort en lief. Zet de Kindertelefoon (0800-0432) en 113 (0800-0113) erbij. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2026-12-21', DATE '2026-12-27'),
  ('Flyer in de bieb of het buurthuis', 'Vraag of je je flyer mag ophangen of neerleggen in de bieb of het buurthuis. Alleen als het mag van de plek, en niet op basisscholen. Stuur een foto in (zonder herkenbare mensen).', 5, DATE '2026-12-21', DATE '2026-12-27'),
  ('Meenemen en achterlaten', 'Oud & nieuw: wat neem jij mee naar het nieuwe jaar, en wat laat je achter? Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2026-12-28', DATE '2027-01-03'),
  ('Begin het jaar niet alleen', 'Zet je link in je story met: ‘Begin het nieuwe jaar niet alleen.’ Stuur een screenshot in.', 2, DATE '2026-12-28', DATE '2027-01-03'),
  ('Geen ‘new year, new me’-druk', 'Maak een post over kleine doelen in plaats van grote voornemens. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-01-04', DATE '2027-01-10'),
  ('Vertel het bij je club', 'Vertel kort over CeritaProject bij je studievereniging, team of club en laat je QR-code zien. Stuur een foto in (zonder herkenbare mensen).', 5, DATE '2027-01-04', DATE '2027-01-10'),
  ('5 dingen die je dag lichter maken', 'Januari is zwaar voor veel mensen. Maak een post met 5 kleine dingen die jouw dag iets lichter maken. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-01-11', DATE '2027-01-17'),
  ('Link in je status', 'Zet je link in je WhatsApp-status. Stuur een screenshot in.', 2, DATE '2027-01-11', DATE '2027-01-17'),
  ('Wat had jij als 15-jarige willen horen?', 'Maak een video of slideshow: wat had jij toen willen horen? Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-01-18', DATE '2027-01-24'),
  ('QR-code op je laptop of hoesje', 'Print je QR-code als sticker of kaartje op je laptop of telefoonhoesje. Stuur een foto in (zonder herkenbare mensen).', 2, DATE '2027-01-18', DATE '2027-01-24'),
  ('Mythe of feit', 'Maak een slideshow ‘mythe of feit’ over praten over je gevoel. Bijvoorbeeld: ‘Huilen is zwak’ – mythe. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-01-25', DATE '2027-01-31'),
  ('Flyer bij je sportclub', 'Vraag of je je flyer mag ophangen in de kantine of kleedkamer van je sportclub. Alleen als het mag van de plek, en niet op basisscholen. Stuur een foto in (zonder herkenbare mensen).', 5, DATE '2027-01-25', DATE '2027-01-31'),
  ('3 tekenen van een goede vriend(in)', 'Maak een post over wat een goede vriendschap is. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-02-01', DATE '2027-02-07'),
  ('Story met je link', 'Deel je link in je story. Bonus: vertel in één zin wat de app voor jou betekent.', 2, DATE '2027-02-01', DATE '2027-02-07'),
  ('Valentijn: zelfliefde', 'Maak een post over lief zijn voor jezelf. Je hoeft geen relatie te hebben om de moeite waard te zijn. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-02-08', DATE '2027-02-14'),
  ('Een lief berichtje met je QR', 'Zet je QR-code in je status met een lief Valentijnsberichtje. Stuur een screenshot in.', 2, DATE '2027-02-08', DATE '2027-02-14'),
  ('Laat je diertje zien', 'Laat in een video je diertje in de app zien en vertel waarom je het leuk vindt. Laat geen namen of berichten van andere leden zien. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-02-15', DATE '2027-02-21'),
  ('Flyer in het jongerencentrum', 'Vraag of je je flyer mag ophangen in een jongerencentrum bij jou in de buurt. Alleen als het mag van de plek, en niet op basisscholen. Stuur een foto in (zonder herkenbare mensen).', 5, DATE '2027-02-15', DATE '2027-02-21'),
  ('Toetsweek? 3 tips tegen stress', 'Maak een post met 3 dingen die jou helpen als het druk is met school of studie. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-02-22', DATE '2027-02-28'),
  ('Link in je bio-check', 'Staat je link nog in je bio? Zet hem er (weer) in en stuur je profiel in.', 2, DATE '2027-02-22', DATE '2027-02-28'),
  ('CeritaProject in 30 seconden', 'Leg in je eigen woorden in 30 seconden uit wat CeritaProject is. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-03-01', DATE '2027-03-07'),
  ('Flyer op je werk of bijbaan', 'Vraag of je je flyer mag ophangen op je werk of bijbaan, bijvoorbeeld in de kantine. Alleen als het mag van de plek, en niet op basisscholen. Stuur een foto in (zonder herkenbare mensen).', 5, DATE '2027-03-01', DATE '2027-03-07'),
  ('Hulp vragen is sterk', 'Maak een post over wat jij had willen weten over hulp vragen. Zet de Kindertelefoon (0800-0432) en 113 (0800-0113) erbij. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-03-08', DATE '2027-03-14'),
  ('Deel je link', 'Deel je link in je story of status. Stuur een screenshot in.', 2, DATE '2027-03-08', DATE '2027-03-14'),
  ('Normaal, maar niemand praat erover', 'Maak een slideshow met dingen die heel normaal zijn, maar waar bijna niemand over praat. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-03-15', DATE '2027-03-21'),
  ('Flyer op een prikbord', 'Hang je flyer op een prikbord, bijvoorbeeld in de supermarkt of bieb. Alleen als het mag van de plek, en niet op basisscholen. Stuur een foto in (zonder herkenbare mensen).', 5, DATE '2027-03-15', DATE '2027-03-21'),
  ('Lente: wat laat jij los?', 'Maak een post over een nieuwe start: wat laat jij deze lente los? Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-03-22', DATE '2027-03-28'),
  ('Link in je story', 'Deel je link in je story met een lentezinnetje.', 2, DATE '2027-03-22', DATE '2027-03-28'),
  ('Q&A over ambassadeur zijn', 'Beantwoord in een video vragen over hoe het is om ambassadeur te zijn. Geen vragen over persoonlijke problemen van anderen. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-03-29', DATE '2027-04-04'),
  ('Maak een highlight', 'Maak een Instagram-highlight ‘CeritaProject’ met je link en QR-code. Stuur een screenshot in.', 2, DATE '2027-03-29', DATE '2027-04-04'),
  ('Het dagboek in de app', 'Laat zien hoe het dagboek werkt, zonder je eigen privé teksten. Laat geen namen of berichten van andere leden zien. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-04-05', DATE '2027-04-11'),
  ('Flyer bij de bieb', 'Vraag of je flyers mag neerleggen bij de balie van de bieb. Alleen als het mag van de plek, en niet op basisscholen. Stuur een foto in (zonder herkenbare mensen).', 5, DATE '2027-04-05', DATE '2027-04-11'),
  ('‘Hoe gaat het echt?’', 'Maak een post over echt vragen hoe het met iemand gaat, en echt luisteren. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-04-12', DATE '2027-04-18'),
  ('Story met je link', 'Deel je link in je story. Stuur een screenshot in.', 2, DATE '2027-04-12', DATE '2027-04-18'),
  ('Iets wat je laat lachen', 'Maak een luchtige, positieve post die je volgers aan het lachen maakt, met je link erbij. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-04-19', DATE '2027-04-25'),
  ('Vertel het aan mensen die je kent', 'Vertel 3 mensen die je kent over CeritaProject en zet je link in je status. Stuur een screenshot van je status in.', 2, DATE '2027-04-19', DATE '2027-04-25'),
  ('Als scrollen je somber maakt', 'Maak een post over wat jij doet als social media je een rotgevoel geeft. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-04-26', DATE '2027-05-02'),
  ('Flyer op je studie', 'Hang je flyer op een plek op je studie waar veel mensen langs lopen. Alleen als het mag van de plek, en niet op basisscholen. Stuur een foto in (zonder herkenbare mensen).', 5, DATE '2027-04-26', DATE '2027-05-02'),
  ('Aan iedereen met examens', 'Maak een post voor iedereen die nu examens of tentamens heeft. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-05-03', DATE '2027-05-09'),
  ('Succes-story', 'Zet een succes-berichtje voor examenkandidaten in je story, met je link.', 2, DATE '2027-05-03', DATE '2027-05-09'),
  ('Tegen jezelf vs. tegen een vriend', 'Maak een slideshow: wat je tegen jezelf zegt, en wat je tegen een vriend zou zeggen. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-05-10', DATE '2027-05-16'),
  ('Flyer in je studentenhuis', 'Hang je flyer op in je studentenhuis of een gedeelde ruimte, als je huisgenoten het goed vinden. Stuur een foto in (zonder herkenbare mensen).', 5, DATE '2027-05-10', DATE '2027-05-16'),
  ('Herkenning in jouw stijl', 'Maak een herkenningspost in je eigen stijl. Sluit af met: je bent niet de enige. Gebruik #ceritaproject. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-05-17', DATE '2027-05-23'),
  ('Link in je bio', 'Check je bio: staat je link er nog? Stuur je profiel in.', 2, DATE '2027-05-17', DATE '2027-05-23'),
  ('Toen praten hielp', 'Vertel over een moment dat praten jou hielp. Deel alleen wat jij wil delen. Zet de Kindertelefoon (0800-0432) en 113 (0800-0113) erbij. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-05-24', DATE '2027-05-30'),
  ('Flyer bij je sportclub', 'Vraag of je opnieuw een flyer mag ophangen bij je sportclub of sportschool. Alleen als het mag van de plek, en niet op basisscholen. Stuur een foto in (zonder herkenbare mensen).', 5, DATE '2027-05-24', DATE '2027-05-30'),
  ('Je mag zijn wie je bent', 'Pride-maand: maak een post over dat iedereen mag zijn wie hij of zij is. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-05-31', DATE '2027-06-06'),
  ('Story met je link', 'Deel je link in je story. Stuur een screenshot in.', 2, DATE '2027-05-31', DATE '2027-06-06'),
  ('Zo ontspan jij', 'Laat zien hoe jij tot rust komt, bijvoorbeeld met het rustmoment in de app of op je eigen manier. Laat geen namen of berichten van andere leden zien. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-06-07', DATE '2027-06-13'),
  ('Vraag een docent of mentor', 'Vraag een docent of mentor op je mbo, hbo of uni of je de flyer mag ophangen. Alleen als het mag van de plek, en niet op basisscholen. Stuur een foto in (zonder herkenbare mensen).', 5, DATE '2027-06-07', DATE '2027-06-13'),
  ('Niet iedereen heeft het makkelijk thuis', 'Maak een rustige post over dat het thuis niet voor iedereen makkelijk is, en dat je er mag zijn. Zet de Kindertelefoon (0800-0432) en 113 (0800-0113) erbij. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-06-14', DATE '2027-06-20'),
  ('Link in je status', 'Zet je link in je WhatsApp-status. Stuur een screenshot in.', 2, DATE '2027-06-14', DATE '2027-06-20'),
  ('Waar ben je trots op?', 'Einde schooljaar: maak een post over iets waar je dit jaar trots op bent, hoe klein ook. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-06-21', DATE '2027-06-27'),
  ('Flyer voor de zomer', 'Hang een flyer op een plek waar jongeren in de zomer komen, zoals de bieb of het buurthuis. Alleen als het mag van de plek, en niet op basisscholen. Stuur een foto in (zonder herkenbare mensen).', 5, DATE '2027-06-21', DATE '2027-06-27'),
  ('Niet iedereen vindt de vakantie leuk', 'Maak een post over dat de zomer ook eenzaam kan voelen. Zet de Kindertelefoon (0800-0432) en 113 (0800-0113) erbij. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-06-28', DATE '2027-07-04'),
  ('Zomer-story', 'Deel je link in een zomerse story. Stuur een screenshot in.', 2, DATE '2027-06-28', DATE '2027-07-04'),
  ('Elke dag iets kleins voor jezelf', 'Doe een week lang elke dag iets kleins voor jezelf en laat het zien in een post. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-07-05', DATE '2027-07-11'),
  ('Flyer bij je zomerbaan', 'Vraag op je zomerbaan of je de flyer mag ophangen. Alleen als het mag van de plek, en niet op basisscholen. Stuur een foto in (zonder herkenbare mensen).', 5, DATE '2027-07-05', DATE '2027-07-11'),
  ('Playlist voor rotdagen', 'Maak een post met nummers die jou helpen op een rotdag. Noem de titels, gebruik geen muziek die je niet mag gebruiken. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-07-12', DATE '2027-07-18'),
  ('Story met je link', 'Deel je link in je story. Stuur een screenshot in.', 2, DATE '2027-07-12', DATE '2027-07-18'),
  ('Tegen je jongere zelf', 'Maak een video: 3 dingen die je tegen je jongere zelf zou zeggen. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-07-19', DATE '2027-07-25'),
  ('QR-code op je scherm', 'Zet je QR-code als achtergrond of in een highlight, zodat je hem makkelijk kunt laten zien. Stuur een screenshot in.', 2, DATE '2027-07-19', DATE '2027-07-25'),
  ('Een rustig moment', 'Maak een rustige post, bijvoorbeeld in de natuur, met een lief zinnetje voor wie het zwaar heeft. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-07-26', DATE '2027-08-01'),
  ('Flyer in de bieb', 'Vraag of je flyers mag neerleggen in de bieb. Alleen als het mag van de plek, en niet op basisscholen. Stuur een foto in (zonder herkenbare mensen).', 5, DATE '2027-07-26', DATE '2027-08-01'),
  ('Als je je buitengesloten voelt', 'Maak een post voor wie zich in de zomer buitengesloten voelt. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-08-02', DATE '2027-08-08'),
  ('Link in je status', 'Zet je link in je status. Stuur een screenshot in.', 2, DATE '2027-08-02', DATE '2027-08-08'),
  ('Opzien tegen het nieuwe schooljaar?', 'Maak een post voor wie opziet tegen het nieuwe school- of studiejaar. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-08-09', DATE '2027-08-15'),
  ('Flyer bij de start van je studie', 'Hang je flyer op je studie, nu iedereen terug is. Alleen als het mag van de plek, en niet op basisscholen. Stuur een foto in (zonder herkenbare mensen).', 5, DATE '2027-08-09', DATE '2027-08-15'),
  ('Contact maken in een nieuwe groep', 'Maak een post met tips om contact te maken in een nieuwe klas of introweek. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-08-16', DATE '2027-08-22'),
  ('Story met je link', 'Deel je link in je story. Stuur een screenshot in.', 2, DATE '2027-08-16', DATE '2027-08-22'),
  ('Zo werken groepen in de app', 'Leg uit hoe groepen in de app werken en waarom ze veilig zijn (eigen leeftijdsgroep). Laat geen namen of berichten van andere leden zien. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-08-23', DATE '2027-08-29'),
  ('Flyer op de introductiemarkt', 'Vraag of je flyers mag neerleggen op de introductie- of informatiemarkt van je studie. Alleen als het mag van de plek, en niet op basisscholen. Stuur een foto in (zonder herkenbare mensen).', 5, DATE '2027-08-23', DATE '2027-08-29'),
  ('Eerste schoolweek-gedachten', 'Maak een herkenningspost over gedachten in de eerste week van school of studie. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-08-30', DATE '2027-09-05'),
  ('Link in je bio', 'Check je bio en stuur je profiel in.', 2, DATE '2027-08-30', DATE '2027-09-05'),
  ('Hoe vraag je hulp?', 'Maak een post met 3 kleine stappen om hulp te vragen. Zet de Kindertelefoon (0800-0432) en 113 (0800-0113) erbij. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-09-06', DATE '2027-09-12'),
  ('Flyer bij je club', 'Hang een flyer op bij je club of vereniging. Alleen als het mag van de plek, en niet op basisscholen. Stuur een foto in (zonder herkenbare mensen).', 5, DATE '2027-09-06', DATE '2027-09-12'),
  ('Wat kun je doen als je pesten ziet?', 'Rond de Week tegen Pesten: maak een post over wat je kunt doen als je ziet dat iemand gepest wordt. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-09-13', DATE '2027-09-19'),
  ('Story met je link', 'Deel je link in je story. Stuur een screenshot in.', 2, DATE '2027-09-13', DATE '2027-09-19'),
  ('Laat je level zien', 'Vertel in een post welk level je als ambassadeur hebt en wat je al hebt gedaan. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-09-20', DATE '2027-09-26'),
  ('Flyer op een nieuwe plek', 'Hang je flyer op een plek waar je hem nog niet eerder hebt opgehangen. Alleen als het mag van de plek, en niet op basisscholen. Stuur een foto in (zonder herkenbare mensen).', 5, DATE '2027-09-20', DATE '2027-09-26'),
  ('Je bent niet te veel', 'Maak een post voor iedereen die weleens denkt dat hij of zij te veel is. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-09-27', DATE '2027-10-03'),
  ('Link in je status', 'Zet je link in je status. Stuur een screenshot in.', 2, DATE '2027-09-27', DATE '2027-10-03'),
  ('Als het vroeg donker wordt', 'Maak een post over wat jou helpt in de donkere herfstmaanden. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-10-04', DATE '2027-10-10'),
  ('Flyer voor de herfst', 'Hang een flyer op in de bieb, het buurthuis of op je studie. Alleen als het mag van de plek, en niet op basisscholen. Stuur een foto in (zonder herkenbare mensen).', 5, DATE '2027-10-04', DATE '2027-10-10'),
  ('Praten over je gevoel is normaal', 'Rond Wereld Mentale Gezondheidsdag (10 oktober): maak een post over waarom praten over je gevoel normaal mag zijn. Zet de Kindertelefoon (0800-0432) en 113 (0800-0113) erbij. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-10-11', DATE '2027-10-17'),
  ('Story met je link', 'Deel je link in je story. Stuur een screenshot in.', 2, DATE '2027-10-11', DATE '2027-10-17'),
  ('5 complimenten', 'Maak een slideshow met 5 complimenten die je iemand zou willen geven. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-10-18', DATE '2027-10-24'),
  ('Highlight bijwerken', 'Werk je highlight of bio bij met je link en QR-code. Stuur een screenshot in.', 2, DATE '2027-10-18', DATE '2027-10-24'),
  ('Echt eng: zeggen dat het niet goed gaat', 'Halloween-week: maak een post over de ‘engste’ dingen, zoals zeggen dat het niet goed met je gaat. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-10-25', DATE '2027-10-31'),
  ('Flyer met Halloween', 'Hang een flyer op een plek waar veel jongeren komen. Alleen als het mag van de plek, en niet op basisscholen. Stuur een foto in (zonder herkenbare mensen).', 5, DATE '2027-10-25', DATE '2027-10-31'),
  ('Wat heb je dit jaar geleerd?', 'Maak een post over wat je dit jaar over jezelf hebt geleerd. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-11-01', DATE '2027-11-07'),
  ('Link in je bio', 'Check je bio en stuur je profiel in.', 2, DATE '2027-11-01', DATE '2027-11-07'),
  ('Bedankt!', 'Maak een bedankpost voor je volgers die zich via jou hebben aangemeld. Noem geen namen. Geen namen, berichten of verhalen van anderen. Zet #samenwerking erbij.', 5, DATE '2027-11-08', DATE '2027-11-14'),
  ('Laatste flyer van het jaar', 'Hang nog één flyer op op een nieuwe plek. Alleen als het mag van de plek, en niet op basisscholen. Stuur een foto in (zonder herkenbare mensen).', 5, DATE '2027-11-08', DATE '2027-11-14')
) AS v(title, body, points, starts, due)
WHERE NOT EXISTS (SELECT 1 FROM public.ambassador_tasks t WHERE t.title = v.title AND t.starts = v.starts);

-- For the readiness check in Beheer → Livegang: how many assignments are planned.
CREATE OR REPLACE FUNCTION public.ambassador_tasks_planned() RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.ambassador_tasks WHERE starts IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.ambassador_tasks_planned() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ambassador_tasks_planned() TO authenticated;
