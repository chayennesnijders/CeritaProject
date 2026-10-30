/**
 * A safety plan in six steps, like care workers use it: what you notice, what you can do yourself,
 * where to find distraction, who can help, which professionals you can call, and what keeps you going.
 */
export const PLAN_SECTIONS = [
  {
    id: "signalen",
    emoji: "🚦",
    title: "Zo merk ik dat het slechter gaat",
    hint: "Gedachten, gevoelens of dingen die je doet. Bijvoorbeeld: slecht slapen, niemand willen zien.",
    placeholder: "Bijvoorbeeld: ik lig wakker en pieker",
  },
  {
    id: "zelf",
    emoji: "🧘",
    title: "Dit kan ik zelf doen",
    hint: "Dingen die jou rustiger maken.",
    placeholder: "Bijvoorbeeld: muziek luisteren, rustmoment met Riti, douchen",
  },
  {
    id: "afleiding",
    emoji: "🌳",
    title: "Hier en bij hen vind ik afleiding",
    hint: "Plekken of mensen waar je even aan iets anders denkt.",
    placeholder: "Bijvoorbeeld: wandelen in het park, bij oma langs",
  },
  {
    id: "mensen",
    emoji: "🤝",
    title: "Deze mensen kan ik om hulp vragen",
    hint: "Met naam en telefoonnummer, zodat je het niet hoeft te zoeken.",
    placeholder: "Bijvoorbeeld: mama – 06 12345678",
  },
  {
    id: "hulp",
    emoji: "📞",
    title: "Deze hulpverleners kan ik bellen",
    hint: "Je huisarts, je mentor of een hulplijn. 113 en de Kindertelefoon staan er al bij.",
    placeholder: "Bijvoorbeeld: huisarts – 010 1234567",
  },
  {
    id: "waarom",
    emoji: "💛",
    title: "Hierom is het de moeite waard",
    hint: "Mensen, dieren, dromen of dingen waar je blij van wordt.",
    placeholder: "Bijvoorbeeld: mijn kat, mijn zusje, later naar Japan",
  },
] as const;
export type PlanSectionId = (typeof PLAN_SECTIONS)[number]["id"];
export type SafetyPlan = Record<PlanSectionId, string[]>;

/** Turns whatever is stored into a complete plan (unknown parts are dropped, lines are kept short). */
export function toPlan(value: unknown): SafetyPlan {
  const src = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(
    PLAN_SECTIONS.map((s) => {
      const lines = Array.isArray(src[s.id]) ? (src[s.id] as unknown[]) : [];
      return [
        s.id,
        lines
          .filter((l): l is string => typeof l === "string")
          .map((l) => l.slice(0, 200))
          .slice(0, 10),
      ];
    }),
  ) as SafetyPlan;
}

/** How many of the six steps have something in them. */
export const stepsFilled = (plan: SafetyPlan) =>
  PLAN_SECTIONS.filter((s) => plan[s.id].some((l) => l.trim())).length;

/** A phone number in a line, so it can become a "Bellen" button. */
export function phoneIn(line: string) {
  const m = /(\+?\d[\d\s-]{6,}\d)/.exec(line);
  return m ? m[1]!.replace(/[\s-]/g, "") : null;
}
