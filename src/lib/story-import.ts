import { ARTICLE_CATEGORIES, type ArticleCategory } from "@/lib/articles";

/**
 * Paste stories from your notes: put a line with only --- (or *** or ===) between stories. The first
 * line of each story is its title. Optional lines anywhere: "Leeftijd: 16+" and "Categorie: …".
 */
export type ImportedStory = {
  title: string;
  body: string;
  minAge: 12 | 16;
  category: ArticleCategory;
};

const CATEGORY_WORDS: Record<ArticleCategory, RegExp> = {
  "in-je-hoofd":
    /angst|depress|paniek|piek|onzeker|zelfbeeld|eetstoornis|somber|burn.?out|adhd|autis|stress/i,
  overkomen: /misbruik|geweld|pest|verlies|overle+d|dood|rouw|trauma|ongeluk|scheiding|ziek/i,
  relaties: /vriend|relatie|verliefd|ouders|moeder|vader|familie|liefde|ex\b/i,
  "jong-zijn": /school|studie|puber|identiteit|gender|lhbt|social media|werk/i,
  "leven-daarna": /herstel|beter|terugkijk|hoop|verder gegaan|nu gaat het/i,
};
const CATEGORY_NAMES: Record<string, ArticleCategory> = {
  "in je hoofd": "in-je-hoofd",
  overkomen: "overkomen",
  "dingen die je zijn overkomen": "overkomen",
  relaties: "relaties",
  "relaties & mensen": "relaties",
  "jong zijn": "jong-zijn",
  "het leven daarna": "leven-daarna",
  "leven daarna": "leven-daarna",
};

/** A best guess from the words in the story; you can change it before importing. */
export function guessCategory(text: string): ArticleCategory {
  let best: ArticleCategory = "in-je-hoofd";
  let bestHits = 0;
  for (const c of ARTICLE_CATEGORIES) {
    const hits = (text.match(new RegExp(CATEGORY_WORDS[c].source, "gi")) ?? []).length;
    if (hits > bestHits) {
      best = c;
      bestHits = hits;
    }
  }
  return best;
}

export function parseStories(raw: string): ImportedStory[] {
  const text = raw.replace(/\r\n?/g, "\n");
  return text
    .split(/\n\s*(?:-{3,}|\*{3,}|={3,})\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      let minAge: 12 | 16 = 12;
      let category: ArticleCategory | null = null;
      const lines = chunk.split("\n").filter((l) => {
        const age = /^\s*leeftijd\s*:\s*(\d+)\s*\+?\s*$/i.exec(l);
        if (age) {
          minAge = Number(age[1]) >= 16 ? 16 : 12;
          return false;
        }
        const cat = /^\s*categorie\s*:\s*(.+?)\s*$/i.exec(l);
        if (cat) {
          category = CATEGORY_NAMES[cat[1]!.toLowerCase()] ?? null;
          return false;
        }
        return true;
      });
      while (lines.length && !lines[0]!.trim()) lines.shift();
      const title = (lines.shift() ?? "")
        .replace(/^\s*(titel\s*:|#+)\s*/i, "")
        .trim()
        .slice(0, 150);
      // Paragraphs: keep blank lines between them, tidy single line breaks within a paragraph.
      const body = lines
        .join("\n")
        .trim()
        .replace(/\n{3,}/g, "\n\n");
      return { title, body, minAge, category: category ?? guessCategory(`${title} ${body}`) };
    })
    .filter((s) => s.title && s.body.length >= 20);
}

const dayKey = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(d);

/**
 * One story a day: the first n free days from tomorrow, skipping days that already have a
 * planned story. Returns dates as YYYY-MM-DD.
 */
export function planDays(n: number, taken: string[], today = new Date()): string[] {
  const busy = new Set(taken);
  const out: string[] = [];
  const d = new Date(`${dayKey(today)}T12:00:00Z`);
  while (out.length < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    const k = d.toISOString().slice(0, 10);
    if (!busy.has(k)) out.push(k);
  }
  return out;
}

/** "YYYY-MM-DD" + "HH:MM" in Dutch time → ISO moment. */
export function dutchMoment(day: string, time: string) {
  const guess = new Date(`${day}T${time}:00Z`);
  const shown = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(guess);
  const [h, m] = shown.split(":").map(Number) as [number, number];
  const [th, tm] = time.split(":").map(Number) as [number, number];
  const diff = (h * 60 + m - (th * 60 + tm)) * 60000;
  return new Date(guess.getTime() - diff).toISOString();
}
export { dayKey };

/**
 * Every photo the stories already have (banners and old photos between the text), once each,
 * so a new story can reuse one as its banner. `inUse` marks banners of stories that are live
 * or planned, so the same photo is not shown twice in Ontdekken.
 */
export function storyPhotoBank(
  stories: { image_url: string | null; body: string; is_published: boolean }[],
): { path: string; inUse: boolean }[] {
  const inUse = new Set(
    stories.filter((s) => s.is_published && s.image_url).map((s) => s.image_url!),
  );
  const seen = new Set<string>();
  const out: { path: string; inUse: boolean }[] = [];
  for (const s of stories) {
    const inText = [...s.body.matchAll(/\[\[foto:([^\]]+)\]\]/g)].map((m) => m[1]!.trim());
    for (const path of [s.image_url, ...inText]) {
      if (!path || seen.has(path)) continue;
      seen.add(path);
      out.push({ path, inUse: inUse.has(path) });
    }
  }
  // Free photos first.
  return out.sort((a, b) => Number(a.inUse) - Number(b.inUse));
}
