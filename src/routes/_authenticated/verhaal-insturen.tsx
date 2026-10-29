import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ARTICLE_CATEGORIES, categoryLabel, type ArticleCategory } from "@/lib/articles";

export const Route = createFileRoute("/_authenticated/verhaal-insturen")({
  head: () => ({
    meta: [
      { title: "Deel jouw verhaal — CeritaProject" },
      { name: "description", content: "Stuur je eigen verhaal in. Je kiest zelf wat je deelt." },
      { property: "og:title", content: "Deel jouw verhaal — CeritaProject" },
      {
        property: "og:description",
        content: "Stuur je eigen verhaal in. Je kiest zelf wat je deelt.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SubmitStoryPage,
});

// Same texts and questions as the "Deel jouw verhaal" page on the website.
const WHY = [
  "Je kunt anderen laten voelen dat ze niet alleen zijn.",
  "Jouw ervaring kan herkenning of een nieuw inzicht geven.",
  "Je kiest zelf wat je wel en niet deelt.",
  "Ook een klein of moeilijk verhaal verdient ruimte.",
];
const QUESTIONS = [
  ["Wat is er gebeurd?", "Vertel wat je kwijt wilt, op jouw manier."],
  ["Hoe voelde je je toen?", "Welke gedachten of gevoelens had je?"],
  ["Wat vond je het moeilijkst?", "Wat begrepen anderen misschien niet?"],
  ["Wat had je op dat moment nodig?", "Wat had iemand voor je kunnen doen of zeggen?"],
  ["Hoe gaat het nu met je?", "Is er iets veranderd, of worstel je er nog steeds mee?"],
  [
    "Wat zou je zeggen tegen iemand die hetzelfde meemaakt?",
    "Misschien help je iemand zich minder alleen te voelen.",
  ],
] as const;
const HOW = [
  "Jij stuurt je verhaal in.",
  "Wij lezen het zorgvuldig.",
  "Je verhaal wordt alleen gepubliceerd als je daar toestemming voor geeft.",
  "We delen je verhaal niet automatisch; we bekijken eerst of het past en veilig is om te delen.",
];

function SubmitStoryPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [penName, setPenName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<ArticleCategory>("in-je-hoofd");
  const [mayPublish, setMayPublish] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const emailOk = email.trim() === "" || /^\S+@\S+\.\S+$/.test(email.trim());
  const ready = title.trim().length >= 3 && body.trim().length >= 20 && mayPublish !== null;

  // Tapping a question puts it in your story as a starting point.
  function addQuestion(q: string) {
    setBody((b) => (b.trim() ? `${b.trimEnd()}\n\n${q}\n` : `${q}\n`));
    setStep(2);
    setTimeout(
      () =>
        document
          .getElementById("jouw-verhaal")
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      50,
    );
  }

  async function submit() {
    if (!ready) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("story_submissions").insert({
      user_id: u.user!.id,
      title: title.trim(),
      body: body.trim(),
      category,
      pen_name: penName.trim() || null,
      contact_email: email.trim() || null,
      may_publish: mayPublish!,
    });
    setBusy(false);
    if (error) {
      toast.error("Versturen lukte niet. Probeer het opnieuw.");
      return;
    }
    toast.success(
      mayPublish
        ? "Dankjewel voor je verhaal 💛 We lezen het zorgvuldig."
        : "Dankjewel voor je verhaal 💛 We lezen het en delen het niet.",
    );
    navigate({ to: "/ontdekken" });
  }

  return (
    <div className="space-y-6 pt-2">
      <Link to="/ontdekken" className="text-sm text-primary underline">
        Terug naar Ontdekken
      </Link>
      <h1 className="text-4xl">Deel jouw verhaal</h1>

      <section className="rounded-3xl bg-card p-6 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Jouw verhaal doet ertoe
        </p>
        <h2 className="mt-2 text-3xl leading-tight text-primary">
          Je hoeft het niet alleen te dragen.
        </h2>
        <p className="mt-3 leading-relaxed">
          Soms lucht het op om je verhaal op te schrijven. Misschien herken je jezelf in de
          ervaringen van anderen, of help je iemand anders zich minder alleen te voelen. Deel alleen
          wat voor jou goed voelt. Je hoeft geen perfecte schrijver te zijn.
        </p>
      </section>

      <section>
        <h2 className="text-2xl">Waarom jouw verhaal delen?</h2>
        <ul className="mt-3 space-y-2">
          {WHY.map((w) => (
            <li key={w} className="flex gap-2 leading-relaxed">
              <span aria-hidden>💛</span>
              {w}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl bg-card p-6 shadow-soft">
        <h2 className="text-2xl text-primary">Even belangrijk om te weten</h2>
        <p className="mt-3 leading-relaxed">
          Deel geen gegevens waarmee jij of iemand anders herkenbaar wordt, tenzij je daar bewust
          toestemming voor hebt. Als je wilt dat je verhaal anoniem wordt gedeeld, laat je naam dan
          leeg of schrijf "Anoniem". We bekijken inzendingen zorgvuldig; insturen betekent niet
          automatisch dat het verhaal gepubliceerd wordt.
        </p>
        <p className="mt-3 leading-relaxed">
          Het e-mailadres in het formulier is bedoeld om zo nodig contact met je op te nemen. Deel
          het alleen als je dat goed vindt.
        </p>
      </section>

      <section className="rounded-3xl bg-card p-6 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Een begin is genoeg
        </p>
        <h2 className="mt-2 text-2xl leading-tight text-primary">
          Weet je niet goed hoe je moet beginnen?
        </h2>
        <p className="mt-3 leading-relaxed">
          Je hoeft niet meteen je hele verhaal te kunnen vertellen. Kies één of meer vragen die bij
          jou passen. Je hoeft ze niet allemaal te beantwoorden. Tik op een vraag om hem in je
          verhaal te zetten.
        </p>
        <div className="mt-4 space-y-3">
          {QUESTIONS.map(([q, hint], i) => (
            <button
              key={q}
              onClick={() => addQuestion(q)}
              className="block w-full rounded-2xl bg-background p-4 text-left transition-transform active:scale-[0.98]"
            >
              <span className="block font-semibold">
                {i + 1}. {q}
              </span>
              <span className="block text-sm text-muted-foreground">{hint}</span>
              <span className="mt-1 block text-xs font-semibold text-primary">
                + Gebruik deze vraag
              </span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed">
          <b>Tip:</b> Je mag ook gewoon je eigen verhaal vertellen. Er is geen goede of foute
          manier.
        </p>
      </section>

      <section id="formulier" className="space-y-4 rounded-3xl bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl">Stuur je verhaal in</h2>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
            Stap {step} van 2
          </span>
        </div>

        {step === 1 ? (
          <>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">
                Naam{" "}
                <span className="font-normal text-muted-foreground">
                  (optioneel, bijv. "Anoniem, 16 jaar")
                </span>
              </span>
              <Input
                value={penName}
                onChange={(e) => setPenName(e.target.value)}
                maxLength={80}
                className="h-12 rounded-2xl"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">
                E-mailadres{" "}
                <span className="font-normal text-muted-foreground">
                  (optioneel, alleen als je wilt dat we contact opnemen)
                </span>
              </span>
              <Input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={200}
                className="h-12 rounded-2xl"
              />
              {!emailOk && (
                <span className="text-xs text-destructive">Dit lijkt geen e-mailadres.</span>
              )}
            </label>
            <Button
              disabled={!emailOk}
              onClick={() => setStep(2)}
              className="h-12 w-full rounded-full"
            >
              Volgende
            </Button>
          </>
        ) : (
          <>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">Titel</span>
              <Input
                placeholder="Bijv. 'Ik dacht dat niemand het zag'"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                className="h-12 rounded-2xl"
              />
            </label>
            <div className="space-y-1.5">
              <span className="text-sm font-semibold">Waar gaat het over?</span>
              <div className="flex flex-wrap gap-2">
                {ARTICLE_CATEGORIES.map((c) => (
                  <Button
                    key={c}
                    variant={category === c ? "default" : "outline"}
                    size="sm"
                    className="rounded-full"
                    onClick={() => setCategory(c)}
                  >
                    {categoryLabel(c)}
                  </Button>
                ))}
              </div>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">
                Jouw verhaal{" "}
                <span className="font-normal text-muted-foreground">
                  (Je kunt de vragen hierboven gebruiken als inspiratie. Schrijf alleen wat voor jou
                  goed voelt.)
                </span>
              </span>
              <Textarea
                id="jouw-verhaal"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="rounded-2xl"
              />
            </label>
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">
                Mag CeritaProject jouw verhaal publiceren in de app, op de website en/of social
                media? <span className="font-normal text-muted-foreground">(Kies één optie)</span>
              </legend>
              {[
                [true, "Ja, ik geef toestemming om mijn verhaal te delen."],
                [false, "Nee, ik geef geen toestemming om mijn verhaal te delen."],
              ].map(([value, label]) => (
                <label
                  key={String(value)}
                  className="flex items-start gap-3 rounded-2xl bg-background p-3 text-sm"
                >
                  <input
                    type="radio"
                    name="toestemming"
                    checked={mayPublish === value}
                    onChange={() => setMayPublish(value as boolean)}
                    className="mt-0.5 size-5 accent-primary"
                  />
                  {label as string}
                </label>
              ))}
            </fieldset>
            <p className="text-sm">✨ Dat is alles! Controleer je keuzes en verstuur je verhaal.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="h-12 rounded-full">
                Vorige
              </Button>
              <Button disabled={!ready || busy} onClick={submit} className="h-12 rounded-full">
                {busy ? "Versturen…" : "Versturen"}
              </Button>
            </div>
          </>
        )}
      </section>

      <section className="pb-4">
        <h2 className="text-2xl">Hoe werkt het?</h2>
        <ol className="mt-3 space-y-2">
          {HOW.map((h, i) => (
            <li key={h} className="flex gap-3 leading-relaxed">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {i + 1}
              </span>
              {h}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
