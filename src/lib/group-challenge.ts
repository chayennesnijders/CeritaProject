/** Ticks a group needs together in one week (the same number as claim_group_challenge in the database). */
export const GROUP_CHALLENGE_GOAL = 15;
export const GROUP_CHALLENGE_XP = 30;

/** One challenge per week, the same for every group; it changes on Monday. */
export const WEEKLY_CHALLENGES = [
  { emoji: "🌳", text: "Ga een kwartier naar buiten" },
  { emoji: "💧", text: "Drink 6 glazen water op een dag" },
  { emoji: "📵", text: "Een uur zonder telefoon" },
  { emoji: "💌", text: "Zeg iets liefs tegen iemand" },
  { emoji: "🧘", text: "Doe een rustmoment met Riti" },
  { emoji: "📔", text: "Schrijf iets in je dagboek" },
  { emoji: "🚶", text: "Maak een wandeling" },
  { emoji: "😴", text: "Ga op tijd naar bed" },
  { emoji: "🎵", text: "Luister naar een liedje dat je blij maakt" },
  { emoji: "🍎", text: "Eet een stuk fruit" },
  { emoji: "🙏", text: "Schrijf 3 dingen op waar je dankbaar voor bent" },
  { emoji: "🧹", text: "Ruim 10 minuten je kamer op" },
];

/** Monday of the week (YYYY-MM-DD) for a day. */
export function mondayOf(day: string) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export function challengeForWeek(monday: string) {
  const weeks = Math.floor(Date.parse(`${monday}T12:00:00Z`) / (7 * 86_400_000));
  return WEEKLY_CHALLENGES[
    ((weeks % WEEKLY_CHALLENGES.length) + WEEKLY_CHALLENGES.length) % WEEKLY_CHALLENGES.length
  ]!;
}
