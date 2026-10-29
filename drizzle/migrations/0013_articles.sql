CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  emoji text NOT NULL DEFAULT '📖',
  category text NOT NULL DEFAULT 'verhaal',
  is_published boolean NOT NULL DEFAULT true,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read articles" ON public.articles FOR SELECT TO authenticated USING (is_published OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin write articles" ON public.articles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update articles" ON public.articles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete articles" ON public.articles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX articles_created_idx ON public.articles (created_at DESC);

CREATE OR REPLACE FUNCTION public.log_admin_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; act text;
BEGIN
  IF TG_OP = 'DELETE' THEN r := to_jsonb(OLD); ELSE r := to_jsonb(NEW); END IF;
  IF TG_TABLE_NAME = 'reports' THEN
    IF TG_OP <> 'UPDATE' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NULL; END IF;
    act := 'report_status';
    r := jsonb_build_object('reason', NEW.reason, 'from', OLD.status, 'to', NEW.status);
  ELSIF TG_TABLE_NAME = 'groups' THEN
    act := 'group_' || lower(TG_OP);
    r := jsonb_build_object('name', r->>'name', 'age_group', r->>'age_group', 'is_archived', r->'is_archived');
  ELSIF TG_TABLE_NAME = 'articles' THEN
    act := 'article_' || lower(TG_OP);
    r := jsonb_build_object('title', r->>'title', 'category', r->>'category', 'is_published', r->'is_published');
  ELSE
    act := 'quote_' || lower(TG_OP);
    r := jsonb_build_object('text', r->>'text', 'quote_date', r->>'quote_date');
  END IF;
  INSERT INTO public.activity_log (actor_id, action, target_table, target_id, details)
  VALUES (auth.uid(), act, TG_TABLE_NAME, (CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END), r);
  RETURN NULL;
END $$;

CREATE TRIGGER log_articles AFTER INSERT OR UPDATE OR DELETE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.log_admin_activity();

-- Verzonnen voorbeeldverhalen (testdata)
INSERT INTO public.articles (title, body, emoji, category) VALUES
('De dag dat ik voor het eerst alleen op school kwam', 'Mijn eerste dag op de nieuwe school was een maand nadat ik was verhuisd. Ik kende niemand en wist niet eens waar het toilet was.\n\nIk had van tevoren afgesproken met mijn moeder dat ik gewoon iemand achterna liep. Dat klinkt makkelijk, maar mijn handen werden heel nat van dentroen.\n\nUiteindelijk vroeg ik aan een meisje in de gang of ze naar de aula ging. Ze zei ja en ik liep mee. Op een given moment zat ik aan tafel met vier mensen die net zo nieuw en zenuwachtig waren als ik.\n\nWat ik geleerd heb: je hoeft niet meteen vrienden te zijn. Het is genoeg om één persoon te vinden die de weg weet.', '🌱', 'verhaal'),
('Een avond zonder telefoon', 'We probeerden het met z''n drieen: een avond zonder telefoon. De eerste twintig minuten wist niemand wat hij moest doen met zijn handen.\n\nToen begonnen we kaarten. Daarna haalden we oude foto''s boven. Ergens halverwege de avond lachte iemand zo hard dat hij van zijn stoel viel.\n\nMijn telefoon stond de hele tijd in de keuken. Ik merkte dat ik minder vaak ging kijken dan ik dacht. Niet elke avond is leuk, maar deze avond bleef in mijn hoofd.\n\nTip: leg je telefoon bij iemand anders in de kamer. Dan is het geen wilskracht, maar gewoon ver weg.', '📵', 'tips'),
('Hoe begin je een gesprek met iemand die je niet kent?', 'Het moeilijkste stukje is de eerste zin. Die hoeft helemaal niets bijzonders te zijn.\n\nJe kunt iets vragen over wat je allebei zien: het eten vandaag, de drukte, een affiche aan de muur. Iets wat je allebei aangaat maakt het makkelijker dan "hallo, ik ben ..." .\n\nAls iemand kort antwoordt, is dat niet per se leuk. Soms is iemand moe, zenuwachtig of gewoon stil. Probeer het later nog een keer.\n\nEn als het niet lukt: dat zegt niets over jou. Het zegt alleen dat deze keer niet werkte.', '💬', 'tips'),
('Verhuizen: wat niemand je vertelt', 'Iedereen zegt dat verhuizen spannend is. Niemand zegt dat het vooral verdrietig is. Je laat je straat achter, je fietsenrek, de bakker die je naam kende.\n\nIn het nieuwe huis duurde het bij mij een half jaar voor ik me thuis voelde. Dat is geen falen. Het duurt gewoon zolang het duurt.\n\nWat wel hielp: één ding uit mijn oude kamer meteen op dezelfde plek zetten. Mijn plank boven het bed. Zo voelde de kamer niet als een hotel.\n\nAls je gaat verhuizen: geef jezelf tijd. En houd vast aan de dingen die je meeneemt, ook al zijn ze klein.', '🏠', 'verhaal');
