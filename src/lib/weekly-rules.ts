/**
 * Once a week every member sees the main house rules again (young people benefit from reminders),
 * with a different extra tip each week so it doesn't feel like the same message every time.
 */
export const CORE_RULES = [
  { emoji: "💛", text: "Wees lief en respectvol, ook als je het ergens niet mee eens bent." },
  { emoji: "🚫", text: "Geen pesten, schelden, discriminatie of buitensluiten." },
  { emoji: "🙊", text: "Oordeel niet: iedereen heeft zijn eigen verhaal." },
  { emoji: "🔒", text: "Deel geen adres, school, telefoonnummer of wachtwoorden." },
  { emoji: "🤝", text: "Spreek niet af met iemand die je alleen van internet kent." },
  { emoji: "🚩", text: "Voelt iets niet goed? Tik op 'melden'. Dat is anoniem." },
] as const;

export const WEEKLY_TIPS = [
  "Vraagt iemand om foto's, geld of geheimen? Stop het gesprek en meld het meteen.",
  "Deel geen berichten of foto's van anderen zonder dat ze het goed vinden.",
  "Geef liever geen medisch advies. Zeg: 'praat erover met iemand die je vertrouwt'.",
  "Kies bij je bericht wat je nodig hebt: luisteren, advies of herkenning. Dan weten anderen hoe ze kunnen reageren.",
  "Durf je niks te zeggen? Tik op '🤍 Snel reageren' onder een bericht. Dat is al genoeg.",
  "Krijg je te veel meldingen? Demp een groep of stel stille uren in bij je profiel.",
  "Je herkent beheerders aan het schildje 🛡️ en coaches aan het petje 🎓.",
  "Even te veel? Doe een rustmoment met Riti, of schrijf het van je af in je dagboek.",
] as const;

/** The extra tip for a week (the Monday's date, YYYY-MM-DD). */
export function tipForWeek(monday: string) {
  const weeks = Math.floor(Date.parse(`${monday}T12:00:00Z`) / (7 * 86_400_000));
  return WEEKLY_TIPS[((weeks % WEEKLY_TIPS.length) + WEEKLY_TIPS.length) % WEEKLY_TIPS.length]!;
}

/** Show the reminder when it hasn't been seen yet this week. */
export const rulesDue = (lastSeenMonday: string | null, thisMonday: string) =>
  lastSeenMonday !== thisMonday;
