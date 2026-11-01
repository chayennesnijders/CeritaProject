/**
 * One-tap replies for members who read along but find it scary to write something themselves
 * ("what if they think I'm weird?"). Kind, safe sentences that fit what the writer said they need.
 */
const BASE = [
  "🤍 Herkenbaar",
  "🫂 Je bent niet alleen",
  "💪 Sterk dat je dit deelt",
  "🙏 Dank je voor het delen",
];
const BY_NEED: Record<string, string[]> = {
  luisteren: [
    "🤍 Ik lees je",
    "🫂 Ik ben er voor je",
    "💗 Dank je dat je dit deelt",
    "🤍 Je mag er zijn",
  ],
  advies: [
    "💡 Ik denk even mee",
    "🙋 Dit heb ik ook gehad",
    "💪 Je kunt dit",
    "🤍 Sterk dat je het vraagt",
  ],
  herkenning: [
    "🙋 Ik herken dit",
    "🫂 Je bent niet alleen",
    "🤍 Ik heb dit ook",
    "💗 Fijn dat je het deelt",
  ],
  steun: [
    "🤗 Een dikke knuffel",
    "💪 Je bent sterker dan je denkt",
    "🤍 Ik denk aan je",
    "🫂 Je staat er niet alleen voor",
  ],
  afleiding: [
    "😄 Zin in een spelletje?",
    "🎵 Ik stuur je een leuk liedje",
    "🌈 Wat maakte jou vandaag blij?",
    "🤍 Ik ben er",
  ],
};

export function quickReplies(need: string | null | undefined): string[] {
  return (need && BY_NEED[need]) || BASE;
}
