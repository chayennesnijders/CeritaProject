/**
 * "Wat heb je nodig?": when you share something, you can say what you'd like from others, so they
 * know whether to just listen, give advice, share that they recognise it, cheer you up or distract
 * you. Shown as a small label on the message, with a tip for the people who reply.
 */
export const NEEDS = [
  {
    id: "luisteren",
    emoji: "🤍",
    label: "Alleen luisteren",
    hint: "Geef liever geen advies. Laat weten dat je het leest en dat je er bent.",
  },
  {
    id: "advies",
    emoji: "💡",
    label: "Advies graag",
    hint: "Tips en ideeën zijn welkom. Wat heeft jou geholpen?",
  },
  {
    id: "herkenning",
    emoji: "🫂",
    label: "Herkenning",
    hint: "Heb jij dit ook meegemaakt? Vertel het, dan voelt diegene zich minder alleen.",
  },
  {
    id: "steun",
    emoji: "🤗",
    label: "Steun",
    hint: "Een lief woord of een knuffel-emoji doet al veel.",
  },
  {
    id: "afleiding",
    emoji: "😊",
    label: "Even afleiding",
    hint: "Iets leuks, grappigs of een spelletje is precies goed.",
  },
] as const;
export type NeedId = (typeof NEEDS)[number]["id"];
export const NEED_IDS = NEEDS.map((n) => n.id);

export const needById = (id: string | null | undefined) => NEEDS.find((n) => n.id === id) ?? null;
