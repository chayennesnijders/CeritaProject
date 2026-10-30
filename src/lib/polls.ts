/** Limits the same as the create_poll function in the database. */
export const POLL_MAX_OPTIONS = 6;

/** What is wrong with a new poll, or null when it can be sent. */
export function pollFormError(question: string, options: string[]) {
  if (question.trim().length < 3) return "Typ een vraag van minstens 3 tekens.";
  if (question.trim().length > 140) return "De vraag mag maximaal 140 tekens zijn.";
  const filled = options.filter((o) => o.trim());
  if (filled.length < 2) return "Vul minstens 2 antwoorden in.";
  if (filled.length > POLL_MAX_OPTIONS) return `Maximaal ${POLL_MAX_OPTIONS} antwoorden.`;
  return null;
}

/** Votes per option as counts and percentages (rounded), plus the total. */
export function tally(optionCount: number, votes: { option: number }[]) {
  const counts = Array<number>(optionCount).fill(0);
  for (const v of votes) if (v.option >= 0 && v.option < optionCount) counts[v.option]!++;
  const total = counts.reduce((a, b) => a + b, 0);
  return {
    total,
    counts,
    percents: counts.map((c) => (total ? Math.round((c / total) * 100) : 0)),
  };
}
