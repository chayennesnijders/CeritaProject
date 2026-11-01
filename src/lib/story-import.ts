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
