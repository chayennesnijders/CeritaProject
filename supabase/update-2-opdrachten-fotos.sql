-- Update voor een database die al met database-in-een-keer.sql is gemaakt (tot en met stap 0047).
-- Bevat: account verwijderen (0048), 365 dagopdrachten (0049), journals uit de shop (0050), foto's en bestanden in chats (0051).
-- Plak dit in Supabase → SQL Editor → New query → Run. Per ongeluk twee keer gedaan? Geen probleem.

-- ===== 0048_account_deletion =====
-- Members can delete their own account (required by the App Store and Play Store).
-- Warnings/time-outs a member received go with them; the ones an admin gave stay, without the admin's name.
ALTER TABLE public.member_warnings DROP CONSTRAINT IF EXISTS member_warnings_member_id_fkey;
ALTER TABLE public.member_warnings ADD CONSTRAINT member_warnings_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.member_warnings ALTER COLUMN admin_id DROP NOT NULL;
ALTER TABLE public.member_warnings DROP CONSTRAINT IF EXISTS member_warnings_admin_id_fkey;
ALTER TABLE public.member_warnings ADD CONSTRAINT member_warnings_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.member_timeouts DROP CONSTRAINT IF EXISTS member_timeouts_member_id_fkey;
ALTER TABLE public.member_timeouts ADD CONSTRAINT member_timeouts_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.member_timeouts ALTER COLUMN admin_id DROP NOT NULL;
ALTER TABLE public.member_timeouts DROP CONSTRAINT IF EXISTS member_timeouts_admin_id_fkey;
ALTER TABLE public.member_timeouts ADD CONSTRAINT member_timeouts_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_responded_by_fkey;
ALTER TABLE public.reports ADD CONSTRAINT reports_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
COMMIT;

-- ===== 0049_rotating_daily_challenges =====
-- 365 daily diary challenges that rotate by themselves: the challenge for a day is picked
-- at 00:00 Dutch time from this pool (day 1 = 1 January 2026) and starts over after 365 days.
-- An admin can still set a challenge for a specific date; that one wins.
CREATE TABLE IF NOT EXISTS public.challenge_pool (
  day_no int PRIMARY KEY CHECK (day_no BETWEEN 1 AND 365),
  title text NOT NULL,
  description text
);
GRANT ALL ON public.challenge_pool TO service_role;
ALTER TABLE public.challenge_pool ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin challenge pool" ON public.challenge_pool;
CREATE POLICY "admin challenge pool" ON public.challenge_pool FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_pool TO authenticated;

INSERT INTO public.challenge_pool (day_no, title, description) VALUES
  (1, 'Schrijf 3 dingen op waar je vandaag blij mee bent', 'Het mag heel klein zijn, zoals een lekker ontbijt of een zonnetje.'),
  (2, 'Beschrijf jezelf in 5 woorden', 'Kies woorden die echt bij jou passen, niet wat anderen vinden.'),
  (3, 'Hoe heb je je beste vriend of vriendin leren kennen?', 'Schrijf het verhaal op van hoe jullie vrienden werden.'),
  (4, 'Teken je humeur van vandaag', 'Gebruik kleuren, vormen of een poppetje. Maak er een foto van voor je dagboek!'),
  (5, 'Wat wil je later worden?', 'Of wat wil je later in elk geval graag doen?'),
  (6, 'Hoe voel je je vandaag in één woord?', 'Leg daarna uit waarom je dat woord kiest.'),
  (7, 'Wat is je oudste herinnering?', 'Hoe oud was je en wat weet je er nog van?'),
  (8, 'Wat ga jij vandaag doen om goed voor jezelf te zorgen?', 'Kies één klein ding en doe het echt.'),
  (9, 'Ga naar buiten en zoek iets groens', 'Schrijf of teken wat je vond.'),
  (10, 'Geef vandaag iemand een compliment', 'Schrijf op wie het was en hoe die persoon reageerde.'),
  (11, 'Als je een superkracht mocht kiezen, welke wordt het?', 'Wat zou je ermee doen?'),
  (12, 'Wat heb je vandaag geleerd?', 'Op school, op je werk, online of van iemand anders.'),
  (13, 'Wat had je vandaag aan?', 'Waarom koos je deze kleren?'),
  (14, 'Wie wil je vandaag bedanken?', 'Schrijf op wie het is en waarom. Durf je het ook echt te zeggen?'),
  (15, 'Wat zou je vrienden over jou zeggen?', 'Schrijf op wat zij waarschijnlijk zouden zeggen. Klopt het?'),
  (16, 'Wat maakt iemand een goede vriend?', 'Noem de drie belangrijkste dingen.'),
  (17, 'Schrijf een gedichtje over de lucht', 'Het hoeft niet te rijmen. Kijk naar buiten voor inspiratie.'),
  (18, 'Waar wil je ooit nog naartoe reizen?', 'Wat wil je daar zien of doen?'),
  (19, 'Wat maakte je vandaag een beetje verdrietig?', 'Het is fijn om het op te schrijven. Wat kan je helpen?'),
  (20, 'Schrijf over je leukste verjaardag', 'Wat maakte die dag zo speciaal?'),
  (21, 'Drink een glas water en schrijf hoe je je voelt', 'Even pauze nemen is ook belangrijk!'),
  (22, 'Welk dier zag je vandaag?', 'Een vogel, een kat, een spin? Wat deed het?'),
  (23, 'Doe iets aardigs zonder dat iemand het weet', 'Wat deed je en hoe voelde dat?'),
  (24, 'Wat zou je doen als je een dag onzichtbaar was?', 'Waar ga je heen?'),
  (25, 'Wat vind je moeilijk, maar wil je toch leren?', 'Wat is een eerste kleine stap?'),
  (26, 'Wat at je vandaag als ontbijt?', 'Was het lekker? Wat is je droomontbijt?'),
  (27, 'Wat is je lievelingsplekje in huis?', 'Beschrijf hoe het eruitziet en waarom je je daar fijn voelt.'),
  (28, 'Waar word je superenthousiast van?', 'Waar zou je uren over kunnen praten?'),
  (29, 'Wie zou je graag beter willen leren kennen?', 'Wat zou je die persoon willen vragen?'),
  (30, 'Bedenk een nieuw ijsjessmaak', 'Hoe heet hij, hoe smaakt hij en hoe ziet hij eruit?'),
  (31, 'Schrijf een brief aan jezelf over 5 jaar', 'Wat hoop je dat er dan is veranderd?'),
  (32, 'Wanneer voel je je het meest rustig?', 'Waar ben je dan en wat doe je?'),
  (33, 'Wat was je lievelingsspeelgoed vroeger?', 'Heb je het nog?'),
  (34, 'Wat is jouw favoriete manier om te ontspannen?', 'Een bad, een boek, een wandeling?'),
  (35, 'Kijk naar de wolken', 'Welke vormen zie je erin?'),
  (36, 'Help iemand thuis met een klusje', 'Wat deed je?'),
  (37, 'Als je een tijdmachine had, waar ga je dan heen?', 'Vroeger of de toekomst?'),
  (38, 'Schrijf over een keer dat je niet opgaf', 'Wat hielp je om door te gaan?'),
  (39, 'Beschrijf je weg naar school of werk', 'Wat kom je allemaal tegen?'),
  (40, 'Welk liedje maakt je altijd vrolijk?', 'Schrijf op welk liedje het is en wat je erbij voelt.'),
  (41, 'Wat is jouw grootste kracht?', 'Waar kun je op bouwen als het even moeilijk gaat?'),
  (42, 'Schrijf over een leuke dag met vrienden', 'Wat deden jullie en waarom was het zo leuk?'),
  (43, 'Schrijf het begin van een sprookje', 'Begin met: Er was eens…'),
  (44, 'Wat staat er op jouw bucketlist?', 'Schrijf minstens vijf dingen op die je ooit wilt doen.'),
  (45, 'Schrijf over een moment dat je je dapper voelde', 'Wat deed je en hoe voelde het daarna?'),
  (46, 'Schrijf over een vakantie die je nooit vergeet', 'Wat gebeurde er en met wie was je?'),
  (47, 'Maak een lijstje met dingen die je opvrolijken', 'Kijk ernaar als je een sombere dag hebt.'),
  (48, 'Wat is je lievelingsboom of -bloem?', 'Waarom vind je die zo mooi?'),
  (49, 'Stuur iemand een lief berichtje', 'Wie koos je en waarom?'),
  (50, 'Welk eten zou je voor altijd willen eten?', 'En welk eten nooit meer?'),
  (51, 'Welk vak of onderwerp vind je het leukst?', 'Waarom?'),
  (52, 'Wat is het eerste wat je deed toen je wakker werd?', 'En wat het laatste voor je ging slapen gisteren?'),
  (53, 'Waar ben je dankbaar voor aan je lichaam?', 'Je benen die je overal brengen, je ogen die alles zien… Wat kies jij?'),
  (54, 'Ben je een ochtendmens of een avondmens?', 'Wanneer voel jij je het fijnst, en waarom denk je dat is?'),
  (55, 'Wat doe jij als een vriend verdrietig is?', 'Wat helpt jou zelf als je verdrietig bent?'),
  (56, 'Maak een foto van iets kleins dat mooi is', 'Een blaadje, een knoop, een druppel… Voeg de foto toe aan je dagboek.'),
  (57, 'Wat wil je dit jaar nog leren?', 'Een taal, een instrument, een sport?'),
  (58, 'Welk gevoel had je het meest deze week?', 'Blij, moe, boos, zenuwachtig? Wat zorgde ervoor?'),
  (59, 'Wat was je eerste schooldag?', 'Wat weet je er nog van?'),
  (60, 'Hoe heb je vannacht geslapen?', 'Wat helpt jou om lekker te slapen?'),
  (61, 'Schrijf over de geluiden buiten', 'Doe je ogen dicht en luister even.'),
  (62, 'Wie kan wel een opkikkertje gebruiken?', 'Wat kun je voor die persoon doen?'),
  (63, 'Wat als je huisdier kon praten?', 'Wat zou het als eerste zeggen?'),
  (64, 'Wat is iets wat je jezelf hebt aangeleerd?', 'Hoe heb je dat gedaan?'),
  (65, 'Welke app gebruik je het meest?', 'Waarom?'),
  (66, 'Welk eten maakt jou blij?', 'Beschrijf je lievelingseten alsof je het aan iemand uitlegt die het nog nooit geproefd heeft.'),
  (67, 'Wat maakt jou uniek?', 'Iets wat niemand anders precies zo heeft als jij.'),
  (68, 'Wie is jouw voorbeeld?', 'Iemand die je kent of iemand die beroemd is. Wat vind je zo goed aan die persoon?'),
  (69, 'Ontwerp je droomkamer', 'Beschrijf of teken alles: de muren, je bed, de lampjes.'),
  (70, 'Hoe ziet jouw droomhuis eruit?', 'Staat het in de stad, in het bos of aan zee?'),
  (71, 'Wat doe je als je je eenzaam voelt?', 'Wie kun je dan een berichtje sturen?'),
  (72, 'Welk liedje doet je denken aan vroeger?', 'Welke herinnering hoort erbij?'),
  (73, 'Doe 5 minuten niks en schrijf wat je merkte', 'Gewoon zitten en ademen. Wat hoorde of voelde je?'),
  (74, 'Hoe ziet de lucht er vandaag uit?', 'Welke kleuren zie je?'),
  (75, 'Wat kun jij delen met anderen?', 'Je tijd, een glimlach, je spullen?'),
  (76, 'Je mag een nieuwe planeet bedenken', 'Hoe heet hij en wie wonen er?'),
  (77, 'Welke tip zou je aan je jongere zelf geven?', 'Wat weet je nu dat je toen nog niet wist?'),
  (78, 'Wat ligt er op je bureau of nachtkastje?', 'Wat zegt dat over jou?'),
  (79, 'Wat ging er vandaag goed?', 'Ook op een moeilijke dag gaat er vaak iets kleins goed. Zoek het maar!'),
  (80, 'Welke kleur past het best bij jou?', 'En welke kleur past bij hoe je je vandaag voelt?'),
  (81, 'Hoe los je ruzie op?', 'Denk aan een keer dat je het weer goedmaakte. Hoe ging dat?'),
  (82, 'Bedenk een nieuw dier', 'Hoe heet het, waar woont het en wat eet het?'),
  (83, 'Welk doel wil je deze maand halen?', 'Maak het klein en duidelijk, dan lukt het beter.'),
  (84, 'Hoe voelt blijdschap in je lichaam?', 'Kriebels in je buik? Een warm gevoel? Beschrijf het.'),
  (85, 'Schrijf over een feestdag die je fijn vond', 'Wat aten jullie en wat deden jullie?'),
  (86, 'Wat zeg je tegen jezelf als iets mislukt?', 'Probeer het eens net zo lief te zeggen als tegen een vriend.'),
  (87, 'Wat zou je doen als je een dag in het bos woonde?', 'Hoe zou je hut eruitzien?'),
  (88, 'Luister vandaag extra goed naar iemand', 'Wat heb je gehoord wat je anders had gemist?'),
  (89, 'Wat als je een dag zo klein was als een mier?', 'Wat zou je allemaal zien?'),
  (90, 'Wat doe je als iets niet meteen lukt?', 'Hoe kun je jezelf aanmoedigen?'),
  (91, 'Wat is je lievelingsdrankje?', 'Warm of koud?'),
  (92, 'Noem iemand die altijd voor je klaarstaat', 'Schrijf op wat die persoon doet waardoor jij je fijn voelt.'),
  (93, 'Wat vind je belangrijk in het leven?', 'Kies drie dingen, bijvoorbeeld eerlijkheid, plezier of familie.'),
  (94, 'Wat zou je tegen een nieuw kind in de klas zeggen?', 'Hoe zorg je ervoor dat iemand zich welkom voelt?'),
  (95, 'Schrijf een liedje over je dag', 'Gebruik de melodie van een liedje dat je al kent.'),
  (96, 'Wat zou je doen als je één dag de baas van Nederland was?', 'Welke regel zou je veranderen?'),
  (97, 'Wat helpt jou als je zenuwachtig bent?', 'Diep ademen, muziek, praten? Schrijf je tips op.'),
  (98, 'Wat was je lievelingsprogramma toen je klein was?', 'Waarom vond je het zo leuk?'),
  (99, 'Waar heb je vandaag even rust nodig?', 'Plan een klein momentje voor jezelf.'),
  (100, 'Zoek een mooie steen of een blaadje', 'Waarom koos je juist deze?'),
  (101, 'Bedenk drie manieren om lief te zijn op school of werk', 'Probeer er vandaag eentje!'),
  (102, 'Met welk beroemd persoon zou je willen lunchen?', 'Wat vraag je?'),
  (103, 'Leer vandaag een nieuw woord', 'Schrijf het op en gebruik het in een zin.'),
  (104, 'Welk liedje zit er vandaag in je hoofd?', 'Waar heb je het gehoord?'),
  (105, 'Welk spulletje zou je nooit weggeven?', 'Vertel wat het is en waarom het zo bijzonder is.'),
  (106, 'Waar ben je trots op?', 'Groot of klein, het telt allemaal!'),
  (107, 'Welke oudere persoon heeft jou iets geleerd?', 'Een opa, oma, buurvrouw of iemand anders?'),
  (108, 'Maak een lijstje met mooie woorden', 'Woorden die fijn klinken als je ze hardop zegt.'),
  (109, 'Waar droom je vaak over?', 'Over je toekomst of echte dromen in je slaap?'),
  (110, 'Schrijf over iets wat je nog dwarszit', 'Opschrijven kan opluchten. Wie kan je erbij helpen?'),
  (111, 'Schrijf over een keer dat je heel hard moest lachen', 'Lach je er nu nog om?'),
  (112, 'Leg je telefoon een uur weg en schrijf wat je deed', 'Hoe voelde het?'),
  (113, 'Wat is je favoriete plek in de natuur?', 'Het strand, het bos, een park?'),
  (114, 'Wat zou je doen als je iemand alleen ziet zitten?', 'Hoe kun je diegene erbij betrekken?'),
  (115, 'Als je een robot had, wat moet hij doen?', 'Geef hem een naam!'),
  (116, 'Wat is een fout waar je trots op bent?', 'Soms leer je het meest van wat misgaat.'),
  (117, 'Wat was het grappigste berichtje dat je vandaag kreeg?', 'Van wie?'),
  (118, 'Waar heb je vandaag om gelachen?', 'Schrijf het grappige moment op, dan kun je er later nog eens om lachen.'),
  (119, 'Wat is je lievelingswoord?', 'Waarom vind je het zo mooi of grappig?'),
  (120, 'Schrijf over iemand die je mist', 'Wat zou je tegen die persoon willen zeggen?'),
  (121, 'Teken je diertje uit de app in jouw stijl', 'Geef het een nieuw outfitje of een nieuwe plek.'),
  (122, 'Welke vaardigheid wil je over een jaar hebben?', 'Wat kun je vandaag al doen om te beginnen?'),
  (123, 'Wat maakt jou zacht en lief vanbinnen?', 'Een knuffel, een lief woord, een dier?'),
  (124, 'Wat is een herinnering aan opa, oma of een ander familielid?', 'Wat deden jullie samen?'),
  (125, 'Wat is jouw lievelingsmanier van bewegen?', 'Dansen, fietsen, zwemmen of iets anders?'),
  (126, 'Hoe kun jij helpen om de natuur te beschermen?', 'Bedenk iets kleins wat je deze week kunt doen.'),
  (127, 'Schrijf een bedankkaartje voor iemand', 'Je mag het ook echt geven.'),
  (128, 'Wat als het een dag snoep regende?', 'Wat zou je doen?'),
  (129, 'Zoek een leuk weetje op', 'Schrijf het op en vertel het aan iemand.'),
  (130, 'Wat zit er in je tas?', 'Is er iets geks bij?'),
  (131, 'Bedank jezelf ergens voor', 'Wat heb jij goed gedaan deze week? Je mag best trots zijn.'),
  (132, 'Hoe ziet jouw perfecte zaterdag eruit?', 'Van het moment dat je wakker wordt tot je gaat slapen.'),
  (133, 'Wat is het liefste wat iemand ooit voor je deed?', 'Hoe voelde je je toen?'),
  (134, 'Schrijf een verhaal van 6 woorden', 'Een heel verhaal in maar zes woorden. Lukt het?'),
  (135, 'Wat zou je doen met een vrije week?', 'Zonder school of werk. Plan je droomweek!'),
  (136, 'Welk weer past bij je gevoel van vandaag?', 'Zonnig, bewolkt, storm of regenboog?'),
  (137, 'Welke geur doet je aan vroeger denken?', 'Waar ben je dan in gedachten?'),
  (138, 'Schrijf een lief briefje aan jezelf', 'Wat heb je nodig om te horen?'),
  (139, 'Schrijf over regen', 'Vind je regen fijn of juist niet? Waarom?'),
  (140, 'Hoe kun je een dier blij maken?', 'Je eigen huisdier, een dier in de buurt of je diertje in de app.'),
  (141, 'Je mag een nieuwe kleur uitvinden', 'Hoe heet hij en hoe ziet hij eruit?'),
  (142, 'Wat wil je beter begrijpen over de wereld?', 'Hoe kun je er meer over leren?'),
  (143, 'Hoe ziet je kamer er nu uit?', 'Opgeruimd of een gezellige rommel?'),
  (144, 'Wat is er mooi aan het seizoen van nu?', 'Denk aan het weer, de kleuren buiten of feestdagen die eraan komen.'),
  (145, 'Wat doe je als je je verveelt?', 'En wat zou je eigenlijk eens willen proberen?'),
  (146, 'Met wie zou je een dag willen ruilen?', 'Waarom? En wat zou je die dag doen?'),
  (147, 'Bedenk een uitvinding die de wereld beter maakt', 'Wat doet het en hoe werkt het?'),
  (148, 'Hoe wil je dat mensen zich bij jou voelen?', 'Hoe kun je daar vandaag al aan werken?'),
  (149, 'Wat zou je tegen een vriend zeggen die zich net zo voelt als jij nu?', 'Zeg dat nu ook eens tegen jezelf.'),
  (150, 'Schrijf over een spannend avontuur', 'Iets wat je ooit meemaakte en heel spannend vond.'),
  (151, 'Wat maakt je ochtend fijn?', 'Bedenk een klein ochtendritueel.'),
  (152, 'Welk dier zou je willen zijn?', 'Wat zou je de hele dag doen?'),
  (153, 'Maak iemand aan het lachen', 'Hoe deed je het?'),
  (154, 'Welk dier zou je als huisdier willen, al is het onmogelijk?', 'Een draak, een pinguïn, een giraf?'),
  (155, 'Wie zou je om hulp kunnen vragen bij iets moeilijks?', 'Durf het eens te vragen!'),
  (156, 'Wat was het lekkerste wat je deze week at?', 'Wie had het gemaakt?'),
  (157, 'Welk dier maakt jou blij?', 'Is het je eigen huisdier, een dier in de natuur of je diertje in de app?'),
  (158, 'Welke gewoonte van jou vind je fijn?', 'Iets wat je vaak doet en waar je je goed bij voelt.'),
  (159, 'Wat vind je fijn aan je klas, team of werk?', 'Zijn er mensen waar je graag mee samenwerkt?'),
  (160, 'Maak een collage van dingen die je blij maken', 'Plaatjes, woorden of foto''s. Maak er een foto van!'),
  (161, 'Welke club of hobby wil je proberen?', 'Wat houdt je tegen, en hoe kun je beginnen?'),
  (162, 'Wanneer heb je voor het laatst flink gelachen?', 'Wat was er zo grappig?'),
  (163, 'Wat was het lekkerste wat je ooit at?', 'Waar was je en wie had het gemaakt?'),
  (164, 'Wat doe jij om je hoofd leeg te maken?', 'Schrijven helpt soms ook!'),
  (165, 'Maak een wandeling en tel wat je ziet', 'Hoeveel vogels, hoeveel honden, hoeveel bloemen?'),
  (166, 'Wat is een goede daad die je laatst zag?', 'Wie deed het?'),
  (167, 'Wat als je kon vliegen?', 'Waar vlieg je als eerste naartoe?'),
  (168, 'Welk nieuw ding heb je deze week geprobeerd?', 'Hoe ging het?'),
  (169, 'Welk filmpje heb je laatst gezien?', 'Wat vond je ervan?'),
  (170, 'Welke leraar of coach heeft je geholpen?', 'Schrijf op wat die persoon jou geleerd heeft.'),
  (171, 'Waar ben je een beetje bang voor?', 'Schrijf het op. Soms wordt iets kleiner als je het op papier zet.'),
  (172, 'Hoe laat je iemand merken dat je om hem of haar geeft?', 'En hoe merk jij dat anderen om jou geven?'),
  (173, 'Beschrijf een kleur aan iemand die niet kan zien', 'Hoe voelt geel? Hoe klinkt blauw?'),
  (174, 'Schrijf over je droomfeest', 'Wat vier je, waar is het en wie komen er?'),
  (175, 'Wat doe je als je boos bent?', 'Wat werkt goed en wat zou je anders willen doen?'),
  (176, 'Schrijf over je eerste huisdier of lievelingsdier', 'Of welk huisdier je graag had gehad.'),
  (177, 'Welke eigenschap van jezelf wil je meer waarderen?', 'Waarom is die eigenschap fijn?'),
  (178, 'Wat vind je mooi aan de nacht?', 'De sterren, de maan, de stilte?'),
  (179, 'Help een vriend met iets waar hij of zij goed in wil worden', 'Hoe hielp je?'),
  (180, 'Je wint een prijs. Waarvoor?', 'Wat zeg je in je speech?'),
  (181, 'Wat is het slimste wat je ooit hebt gedaan?', 'Waarom was het slim?'),
  (182, 'Wat is je favoriete plek om te zitten?', 'Op de bank, op je bed, op de grond?'),
  (183, 'Wat is iets dat je vroeger moeilijk vond en nu kunt?', 'Kijk eens hoeveel je al gegroeid bent!'),
  (184, 'Wat zou je graag beter willen kunnen?', 'Wat is een eerste kleine stap?'),
  (185, 'Wat is een goede vraag om iemand beter te leren kennen?', 'Bedenk er drie en probeer er eentje uit!'),
  (186, 'Schrijf een brief aan je knuffel of lievelingsspulletje', 'Wat zou je het willen vertellen?'),
  (187, 'Wat wil je ooit nog eens durven?', 'Iets spannends dat je stiekem graag wilt doen.'),
  (188, 'Schrijf over een moment dat je je trots voelde', 'Wat had je gedaan?'),
  (189, 'Wat is iets wat je vroeger geloofde en nu niet meer?', 'Bijvoorbeeld over monsters, sprookjes of volwassenen.'),
  (190, 'Hoe kun je vandaag lief zijn voor jezelf?', 'Iets kleins is genoeg.'),
  (191, 'Welke planten of dieren leven bij jou in de buurt?', 'Ga eens op ontdekkingstocht.'),
  (192, 'Zeg vandaag tegen iemand wat je aan hem of haar waardeert', 'Hoe reageerde die persoon?'),
  (193, 'Wat zou je doen in een pretpark helemaal voor jou alleen?', 'In welke attractie ga je als eerste?'),
  (194, 'Hoe leer jij het fijnst?', 'Door te lezen, te kijken, te doen of uit te leggen?'),
  (195, 'Wat heb je vandaag gedronken?', 'Genoeg water gehad?'),
  (196, 'Waar ben je blij om dat je het hebt?', 'Een bed, een telefoon, een fiets… Wat zou je echt missen?'),
  (197, 'Hoe ga jij om met stress?', 'Wat helpt jou om rustig te worden?'),
  (198, 'Schrijf over een keer dat je iemand hielp', 'Hoe voelde het om te helpen?'),
  (199, 'Bedenk een nieuwe feestdag', 'Hoe heet hij, wanneer is het en hoe vier je hem?'),
  (200, 'Hoe ziet een perfecte dag over 10 jaar eruit?', 'Waar woon je, wat doe je, met wie ben je?'),
  (201, 'Wat maakt jou onzeker?', 'En wat zou je tegen jezelf zeggen om je sterker te voelen?'),
  (202, 'Schrijf over een keer dat je verdwaald was', 'Hoe vond je de weg terug?'),
  (203, 'Wat helpt jou als je verdrietig bent?', 'Maak een lijstje voor later.'),
  (204, 'Schrijf over de zon op je huid', 'Hoe voelt dat?'),
  (205, 'Wat kun je doen voor je buren?', 'Een groet, een helpende hand?'),
  (206, 'Als je een boek was, welk boek ben je?', 'Waar gaat het over?'),
  (207, 'Waar heb je deze maand vooruitgang in geboekt?', 'Hoe merk je dat?'),
  (208, 'Welke sokken heb je aan?', 'Hebben ze een leuk motief?'),
  (209, 'Schrijf over een fijn geurtje', 'Vers brood, regen, zonnebrand… Welke geur maakt jou blij en waarom?'),
  (210, 'Wat is je lievelingsseizoen en waarom?', 'Denk aan het weer, kleding, eten en activiteiten.'),
  (211, 'Wat maakt een groep fijn om in te zitten?', 'Denk aan de groepen in de app, je klas of een club.'),
  (212, 'Ontwerp je eigen logo', 'Welke vormen en kleuren passen bij jou?'),
  (213, 'Welke wereldplek wil je met eigen ogen zien?', 'Waarom juist die plek?'),
  (214, 'Hoe voel je je als je wakker wordt?', 'En hoe zou je je ochtend fijner kunnen maken?'),
  (215, 'Wat is een cadeau dat je nooit vergeet?', 'Van wie kreeg je het?'),
  (216, 'Welke grens wil je beter aangeven?', 'Nee zeggen mag ook. Wanneer wil je dat vaker doen?'),
  (217, 'Wat zou een vogel van jouw straat denken?', 'Schrijf vanuit de vogel.'),
  (218, 'Schrijf over een keer dat iemand lief tegen jou was', 'Hoe kun je dat doorgeven?'),
  (219, 'Wat als je een dag de leraar of de baas was?', 'Wat zou je anders doen?'),
  (220, 'Wat zou je willen weten over de ruimte?', 'Of over de zee, of over dieren?'),
  (221, 'Hoe was het weer vandaag?', 'Paste je kleding erbij?'),
  (222, 'Wie heeft jou laatst geholpen?', 'Hoe hielp die persoon jou, en hoe voelde dat?'),
  (223, 'Welk karakter uit een boek of film lijkt op jou?', 'Waarin lijken jullie op elkaar?'),
  (224, 'Welk spel speel je het liefst met anderen?', 'Waarom is dat spel zo leuk?'),
  (225, 'Schrijf een gedicht met de letters van je naam', 'Elke regel begint met een letter van je naam.'),
  (226, 'Wat hoop je dat er volgend jaar gebeurt?', 'Voor jezelf, je familie of de wereld.'),
  (227, 'Welk liedje past bij je gevoel van nu?', 'Waarom past het zo goed?'),
  (228, 'Welke foto op je telefoon maakt je blij?', 'Wat zie je erop en wat gebeurde er toen?'),
  (229, 'Wat eet je het liefst als je je niet zo lekker voelt?', 'Waarom helpt dat?'),
  (230, 'Wat zie je als je uit het raam kijkt?', 'Beschrijf het zo precies mogelijk.'),
  (231, 'Hoe kun je de wereld een klein beetje mooier maken?', 'Bedenk iets wat je deze week kunt doen.'),
  (232, 'Je mag een kasteel ontwerpen', 'Wat zit er allemaal in?'),
  (233, 'Wat is een goede gewoonte die je wilt starten?', 'Hoe ga je het onthouden?'),
  (234, 'Wat is het leukste wat er op je telefoon staat?', 'Een foto, een spelletje, een berichtje?'),
  (235, 'Wat was het beste moment van deze week?', 'Beschrijf het zo precies mogelijk: waar was je, met wie, wat gebeurde er?'),
  (236, 'Wat is iets wat mensen vaak niet over jou weten?', 'Je hoeft het met niemand te delen, alleen met je dagboek.'),
  (237, 'Hoe zou jij een vriendschapsfeest vieren?', 'Wie nodig je uit, en wat gaan jullie doen?'),
  (238, 'Bedenk een recept voor een goed humeur', 'Bijvoorbeeld: 2 scheppen zon, 1 snufje muziek…'),
  (239, 'Wat zou je willen uitvinden?', 'Iets wat jouw leven of dat van anderen makkelijker maakt.'),
  (240, 'Schrijf drie gevoelens op die je vandaag had', 'Welke was het sterkst?'),
  (241, 'Schrijf over een sneeuwdag of een hele warme dag', 'Wat deed je die dag?'),
  (242, 'Wat zijn je drie favoriete knuffelwoorden?', 'Woorden die je goed doen als je ze hoort.'),
  (243, 'Waar zou je willen kamperen?', 'Wat neem je mee?'),
  (244, 'Ruim samen met iemand iets op', 'Samen gaat het vaak sneller én leuker.'),
  (245, 'Wat als je met dieren kon praten?', 'Welk dier vraag je wat?'),
  (246, 'Schrijf drie dingen op die je goed hebt gedaan deze week', 'Ook kleine dingen tellen!'),
  (247, 'Hoe laat ging je gisteren naar bed?', 'Voel je je uitgerust?'),
  (248, 'Welk boek, serie of film maakt je blij?', 'Waarom vind je het zo leuk? Wie zou je het aanraden?'),
  (249, 'Wat maakt jou boos, en wat doe je dan?', 'Boos zijn mag. Wat helpt jou om het weer rustig te krijgen?'),
  (250, 'Wat heb je van een vriend geleerd?', 'Iets wat je nu zelf ook doet of weet.'),
  (251, 'Maak een stripje van iets wat vandaag gebeurde', 'Drie of vier plaatjes is genoeg.'),
  (252, 'Welk dier zou je ooit willen zien in het echt?', 'Waar leeft het?'),
  (253, 'Wanneer voel je je echt jezelf?', 'Met wie ben je dan, of wat doe je dan?'),
  (254, 'Wat was een moment dat alles goed voelde?', 'Beschrijf waar je was en wat je zag.'),
  (255, 'Zet een fijn liedje op en schrijf erover', 'Waarom koos je dit liedje?'),
  (256, 'Wat is het mooiste wat je ooit in de natuur zag?', 'Een regenboog, een hert, een zonsondergang?'),
  (257, 'Wat kun je doen om iemand welkom te laten voelen?', 'In een groep, in de klas of in de app.'),
  (258, 'Welk sprookjesfiguur zou je willen zijn?', 'Waarom?'),
  (259, 'Wat heb je van een moeilijke situatie geleerd?', 'Hoe ben je er sterker door geworden?'),
  (260, 'Wat heb je vandaag gekocht of gekregen?', 'Iets nodigs of iets leuks?'),
  (261, 'Waar ben je dankbaar voor in je vriendschappen?', 'Wat maakt jouw vrienden zo fijn?'),
  (262, 'Welke drie dingen neem je mee naar een onbewoond eiland?', 'En waarom juist die drie?'),
  (263, 'Wie maakt jou altijd aan het lachen?', 'Wat doet die persoon dan precies?'),
  (264, 'Schrijf een verhaal vanuit je huisdier of diertje', 'Wat denkt het de hele dag?'),
  (265, 'Wat is een klein doel voor morgen?', 'Iets wat je morgen kunt doen en waar je trots op kunt zijn.'),
  (266, 'Wat doe je als je iets spannends moet doen?', 'Bedenk een trucje voor de volgende keer.'),
  (267, 'Wat leerde je van een fout die je ooit maakte?', 'Fouten maken hoort erbij. Wat heb je ervan geleerd?'),
  (268, 'Wat doe je om je energie op te laden?', 'Ben je meer iemand van rust of van actie?'),
  (269, 'Plant iets of zorg voor een plant', 'Schrijf op hoe het gaat.'),
  (270, 'Vraag iemand hoe het echt met hem of haar gaat', 'En luister echt naar het antwoord.'),
  (271, 'Je mag één regel in de natuurkunde veranderen', 'Wat verander je en wat gebeurt er dan?'),
  (272, 'Welke vraag zou je aan een expert willen stellen?', 'Een dokter, een astronaut, een kok?'),
  (273, 'Welk geluid hoor je het meest in je huis?', 'Een wasmachine, gelach, muziek?'),
  (274, 'Noem 5 kleine dingen die je dag beter maakten', 'Een glimlach, een warme douche, een leuk berichtje…'),
  (275, 'Ben je meer een prater of een luisteraar?', 'Wat vind je fijn aan hoe jij bent?'),
  (276, 'Hoe ga je om met iemand die anders denkt?', 'Kun je toch iets van die persoon leren?'),
  (277, 'Bedenk een nieuwe sport', 'Wat zijn de regels en wat heb je nodig?'),
  (278, 'Waar wil je goed in worden?', 'Wie kan je daarbij helpen?'),
  (279, 'Wat maakt jou jaloers?', 'Jaloers zijn is normaal. Wat zegt het over wat jij graag wilt?'),
  (280, 'Schrijf over je eerste vriendje of vriendinnetje', 'Speelden jullie samen? Wat deden jullie?'),
  (281, 'Wanneer was je voor het laatst buiten?', 'Ga even naar buiten en schrijf wat je zag.'),
  (282, 'Hoe ruikt het buiten vandaag?', 'Probeer het te beschrijven.'),
  (283, 'Geef iemand een high five of een knuffel', 'Natuurlijk alleen als diegene dat fijn vindt!'),
  (284, 'Wat als je een week in een boomhut woonde?', 'Wat neem je mee?'),
  (285, 'Wat is iets wat je anders ziet dan vroeger?', 'Wat heeft ervoor gezorgd dat je anders ging denken?'),
  (286, 'Wat is je favoriete snack?', 'Zoet of zout?'),
  (287, 'Welk talent heb jij gekregen?', 'Iedereen is ergens goed in. Waar ben jij goed in?'),
  (288, 'Wat is jouw manier om iemand op te vrolijken?', 'Een grapje, een knuffel, een kaartje?'),
  (289, 'Wat zou je een jonger kind willen leren?', 'Iets wat jij al weet en wat handig is.'),
  (290, 'Beschrijf een geluid dat je nu hoort', 'Schrijf het zo dat iemand anders het ook bijna hoort.'),
  (291, 'Wat zou je doen als je niet bang kon zijn?', 'Schrijf op wat je dan meteen zou doen.'),
  (292, 'Hoe zorg je voor jezelf als je moe bent?', 'Wat heb je dan nodig?'),
  (293, 'Wat is een plek waar je vroeger vaak kwam?', 'Hoe ziet die plek er nu uit?'),
  (294, 'Wat mag je van jezelf iets minder streng nemen?', 'Niemand is perfect. Waar mag je iets milder zijn?'),
  (295, 'Wat doe je het liefst op een zonnige dag?', 'En op een regenachtige dag?'),
  (296, 'Schrijf een positieve boodschap op een briefje', 'Leg het ergens neer waar iemand het vindt.'),
  (297, 'Als jij een snoepje was, welke smaak heb je?', 'En hoe ziet je papiertje eruit?'),
  (298, 'Leer vandaag iets nieuws uit een filmpje of boek', 'Wat was het?'),
  (299, 'Wat heb je vandaag gemaakt?', 'Een tekening, een broodje, een huiswerkopdracht?'),
  (300, 'Waar ben je dankbaar voor in je familie?', 'Denk aan een gewoonte, een grapje of een persoon.'),
  (301, 'Waar kun jij helemaal in opgaan?', 'Iets waarbij je de tijd vergeet.'),
  (302, 'Schrijf over iemand die dapper is', 'Wat deed die persoon waardoor je dat vindt?'),
  (303, 'Ontwerp een outfit voor je lievelingsfeest', 'Teken of beschrijf alles van top tot teen.'),
  (304, 'Schrijf over je droombaan', 'Wat doe je de hele dag?'),
  (305, 'Wat is iets wat je wilde zeggen maar niet zei?', 'Schrijf het hier op.'),
  (306, 'Schrijf over een uitje met school', 'Waar gingen jullie heen?'),
  (307, 'Schrijf je avondritueel op', 'Wat doe je voor het slapengaan? Wat zou je willen toevoegen?'),
  (308, 'Welk insect vind je interessant?', 'Wat weet je erover?'),
  (309, 'Wat zou je voor je familie willen doen?', 'Iets kleins waar ze blij van worden.'),
  (310, 'Je kunt één ding uit een film echt maken', 'Wat kies je?'),
  (311, 'Wat motiveert jou?', 'Waar krijg je zin van om iets te doen?'),
  (312, 'Wie heb je vandaag als eerste gesproken?', 'Waar ging het over?'),
  (313, 'Schrijf een bedankbriefje aan je toekomstige zelf', 'Bedank jezelf alvast voor alles wat je nog gaat doen.'),
  (314, 'Hoe zou jouw superheldnaam zijn?', 'En wat is je superkracht?'),
  (315, 'Wat is een mooi compliment dat je kreeg?', 'Weet je nog wie het zei? Hoe voelde dat?'),
  (316, 'Schrijf een gedichtje over regen', 'Hoe klinkt het, hoe ruikt het, hoe voelt het?'),
  (317, 'Wat wil je je kinderen of jongere mensen later vertellen?', 'Welke les wil je doorgeven?'),
  (318, 'Wanneer voelde je je laatst blij verrast?', 'Wat gebeurde er?'),
  (319, 'Wat was een dag waarop je iets nieuws durfde?', 'Hoe voelde dat?'),
  (320, 'Wie kun jij bellen als het even niet gaat?', 'Schrijf de namen op. Je staat er niet alleen voor.'),
  (321, 'Zoek een plekje buiten om even te zitten', 'Wat merk je op als je stil bent?'),
  (322, 'Bedank iemand die vaak vergeten wordt', 'De schoonmaker, de buschauffeur, de kantinejuf?'),
  (323, 'Wat als je wakker werd in een computerspel?', 'Welk spel is het en wat doe je?'),
  (324, 'Hoe vier jij een succes?', 'Ook kleine successen verdienen een feestje!'),
  (325, 'Wat is iets dat je vandaag voor het eerst deed?', 'Ook een kleinigheid telt!'),
  (326, 'Wat is iets moois dat je vandaag zag?', 'Een wolk, een kunstwerk, een lieve actie… Beschrijf het.'),
  (327, 'Wat vind je lastig om te vragen aan anderen?', 'Hoe zou je het toch kunnen vragen?'),
  (328, 'Hoe kun je een vriendschap sterker maken?', 'Bedenk één ding dat je deze week kunt doen.'),
  (329, 'Maak een playlist voor je week', 'Kies vijf liedjes en schrijf op waarom.'),
  (330, 'Wat zou je kopen als je een miljoen had?', 'En wat zou je weggeven?'),
  (331, 'Wat zou je willen loslaten?', 'Een zorg, een gedachte of een gewoonte. Schrijf het op en laat het gaan.'),
  (332, 'Welke herinnering wil je nooit vergeten?', 'Schrijf hem op, dan blijft hij bewaard.'),
  (333, 'Wat is een klein cadeautje voor jezelf vandaag?', 'Een warm drankje, een dutje, een leuk filmpje?'),
  (334, 'Wat vind je fijn aan de zee of aan water?', 'Zwemmen, kijken, luisteren?'),
  (335, 'Hoe help je iemand die gepest wordt?', 'Wat kun je doen of tegen wie kun je het zeggen?'),
  (336, 'Welk geluid zou je willen kunnen maken?', 'Een leeuwengebrul? Een vogelfluit?'),
  (337, 'Welk boek zou iedereen moeten lezen?', 'Waarom?'),
  (338, 'Welk spelletje heb je laatst gespeeld?', 'Won je?'),
  (339, 'Welke uitvinding ben je dankbaar voor?', 'Muziek op je telefoon? Een warme verwarming? Leg uit waarom.'),
  (340, 'Welke regel zou je zelf willen bedenken?', 'Voor thuis, op school of in de hele wereld.'),
  (341, 'Wie zou je een kaartje willen sturen?', 'Wat zou erop staan?'),
  (342, 'Bedenk een titel voor de film van jouw leven', 'En wie zou jou spelen?'),
  (343, 'Welke gewoonte wil je volgend jaar hebben?', 'Hoe kun je daar nu al mee oefenen?'),
  (344, 'Welk gevoel wil je morgen meer hebben?', 'Wat kun je doen om dat gevoel te krijgen?'),
  (345, 'Schrijf over iets wat je vorig jaar deed', 'Wat is er sindsdien veranderd?'),
  (346, 'Hoe zorg jij voor je lichaam?', 'Slapen, eten, bewegen: wat gaat goed en wat kan beter?'),
  (347, 'Wat zou je doen als dieren konden praten?', 'Wat zou je ze vragen?'),
  (348, 'Deel iets lekkers met iemand', 'Wat deelde je en met wie?'),
  (349, 'Wat als je de wereld rond kon reizen in één dag?', 'Welke plekken zie je?'),
  (350, 'Wat zou je willen leren van iemand uit je familie?', 'Vraag het eens!'),
  (351, 'Wat ruik je op dit moment?', 'Probeer het te beschrijven.'),
  (352, 'Wat vind je fijn aan jezelf?', 'Schrijf drie dingen op. Het mag over je karakter gaan of over wat je kunt.'),
  (353, 'Wat heb je deze maand over jezelf geleerd?', 'Iets nieuws ontdekt? Schrijf het op.'),
  (354, 'Wat vind je belangrijk als je met iemand praat?', 'Luisteren, eerlijk zijn, grapjes maken?'),
  (355, 'Schrijf een verhaal dat begint met: Opeens ging het licht uit…', 'Wat gebeurt er daarna?'),
  (356, 'Wat is je allergrootste droom?', 'Schrijf hem op, hoe groot hij ook is!'),
  (357, 'Hoe ziet jouw veilige plek eruit?', 'Een echte plek of een plek in je fantasie.'),
  (358, 'Wat is het mooiste wat je ooit hebt gemaakt?', 'Een tekening, een taart, een hut?'),
  (359, 'Welke gedachte wil je vandaag vaker denken?', 'Bijvoorbeeld: Ik doe mijn best en dat is genoeg.'),
  (360, 'Schrijf over de wind', 'Hoe hard waait het vandaag? Wat beweegt er?'),
  (361, 'Schrijf over iemand die altijd aardig is', 'Wat kun je van die persoon leren?'),
  (362, 'Als je een dag een dier mocht zijn, welk dier ben je?', 'Hoe ziet je dag eruit?'),
  (363, 'Hoe ben je dit jaar gegroeid?', 'Kijk terug: wat is er veranderd aan jou?'),
  (364, 'Wat was het leukste moment van vandaag?', 'En wat zou je morgen graag willen meemaken?'),
  (365, 'Wat is je favoriete emoji?', 'Waarom past die bij jou?')
ON CONFLICT (day_no) DO UPDATE SET title = excluded.title, description = excluded.description;

CREATE OR REPLACE FUNCTION public.today_challenge()
RETURNS SETOF public.daily_challenges LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d date := (now() AT TIME ZONE 'Europe/Amsterdam')::date; n int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.daily_challenges WHERE challenge_date = d) THEN
    n := ((d - DATE '2026-01-01') % 365 + 365) % 365 + 1;
    INSERT INTO public.daily_challenges (challenge_date, title, description)
      SELECT d, p.title, p.description FROM public.challenge_pool p WHERE p.day_no = n
      ON CONFLICT (challenge_date) DO NOTHING;
  END IF;
  RETURN QUERY SELECT * FROM public.daily_challenges WHERE challenge_date = d;
END $$;
REVOKE ALL ON FUNCTION public.today_challenge() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.today_challenge() TO authenticated;

-- Only log challenge changes made by admins, not the automatic daily pick.
DROP TRIGGER IF EXISTS log_challenges ON public.daily_challenges;
CREATE TRIGGER log_challenges AFTER INSERT OR UPDATE OR DELETE ON public.daily_challenges
  FOR EACH ROW WHEN (public.has_role(auth.uid(), 'admin')) EXECUTE FUNCTION public.log_admin_activity();
COMMIT;

-- ===== 0050_hide_journals =====
-- The shop no longer sells journals (printable pdf's): digital goods would need Apple/Google in-app payments.
UPDATE public.shop_products SET is_active = false WHERE category = 'journals' OR kind = 'digitaal';
COMMIT;

-- ===== 0051_chat_attachments =====
-- Photos (camera or gallery) and files in private chats and groups.
-- Same model as voice memos: private bucket, path "<sender>/<dm|group>/<conversation|group>/<file>",
-- uploads only where you may post, reading only for messages you can see.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('chat-files', 'chat-files', false, 20971520, ARRAY[
    'image/*', 'video/mp4', 'video/quicktime', 'video/webm', 'application/pdf', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ])
ON CONFLICT (id) DO UPDATE SET file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS attachment_path text, ADD COLUMN IF NOT EXISTS attachment_name text, ADD COLUMN IF NOT EXISTS attachment_type text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS attachment_path text, ADD COLUMN IF NOT EXISTS attachment_name text, ADD COLUMN IF NOT EXISTS attachment_type text;

CREATE OR REPLACE FUNCTION public.validate_chat_attachment() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE expected text;
BEGIN
  IF TG_TABLE_NAME = 'direct_messages' THEN expected := NEW.sender_id::text || '/dm/' || NEW.conversation_id::text || '/';
  ELSE expected := NEW.author_id::text || '/group/' || NEW.group_id::text || '/'; END IF;
  IF NEW.attachment_path IS NOT NULL AND (left(NEW.attachment_path, length(expected)) <> expected OR NEW.attachment_path LIKE '%..%') THEN
    RAISE EXCEPTION 'Ongeldige bijlage';
  END IF;
  IF NEW.attachment_name IS NOT NULL AND length(NEW.attachment_name) > 200 THEN RAISE EXCEPTION 'Bestandsnaam is te lang'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_dm_attachment ON public.direct_messages;
CREATE TRIGGER validate_dm_attachment BEFORE INSERT OR UPDATE ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.validate_chat_attachment();
DROP TRIGGER IF EXISTS validate_group_attachment ON public.posts;
CREATE TRIGGER validate_group_attachment BEFORE INSERT OR UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.validate_chat_attachment();

DROP POLICY IF EXISTS "upload own chat files" ON storage.objects;
DROP POLICY IF EXISTS "read accessible chat files" ON storage.objects;
DROP POLICY IF EXISTS "remove own chat files" ON storage.objects;
CREATE POLICY "upload own chat files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='chat-files' AND (storage.foldername(name))[1]=auth.uid()::text AND (((storage.foldername(name))[2]='dm' AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id::text=(storage.foldername(name))[3] AND auth.uid() IN (c.user_a,c.user_b) AND c.status='accepted' AND public.can_message(public.conv_other(c.id)))) OR ((storage.foldername(name))[2]='group' AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id::text=(storage.foldername(name))[3] AND public.is_member(g.id) AND public.can_access_group(g.id) AND NOT public.is_timed_out(auth.uid())))));
CREATE POLICY "read accessible chat files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='chat-files' AND ((storage.foldername(name))[1]=auth.uid()::text OR EXISTS (SELECT 1 FROM public.direct_messages m WHERE m.attachment_path=name) OR EXISTS (SELECT 1 FROM public.posts p WHERE p.attachment_path=name AND NOT p.is_hidden)));
CREATE POLICY "remove own chat files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='chat-files' AND (storage.foldername(name))[1]=auth.uid()::text);
COMMIT;
