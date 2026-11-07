import type { RitiExpression } from "@/lib/riti";

export type TodayState = {
  /** Today's mood is not chosen yet: Riti asks that first. */
  moodChosen: boolean;
  news: number;
  pet: { name: string; careLeft: number } | null;
  groupUnread: number;
  challengeDone: boolean;
  story: { id: string; title: string; read: boolean } | null;
  affirmation: string;
};

export type RitiLine = {
  id: "gevoel" | "nieuws" | "diertje" | "groepen" | "opdracht" | "verhaal" | "zinnetje";
  text: string;
  expression: RitiExpression;
  /** Where the button under the speech bubble goes; none for the mood question and the kind sentence. */
  to?: string;
  storyId?: string;
  button?: string;
};

/**
 * What Riti says on the home screen, most important first: she tells you in one sentence what is
 * waiting for you today, and a tap on her shows the next thing. Always ends with a kind sentence.
 */
export function ritiToday(s: TodayState): RitiLine[] {
  const lines: RitiLine[] = [];
  if (!s.moodChosen) lines.push({ id: "gevoel", text: "Hoe voel je je vandaag?", expression: "neutraal" });
  if (s.news > 0)
    lines.push({
      id: "nieuws",
      text: s.news === 1 ? "Er is iets nieuws voor je!" : `Er zijn ${s.news} nieuwe dingen voor je!`,
      expression: "blij",
      to: "/meldingen",
      button: "Bekijken",
    });
  if (!s.pet)
    lines.push({ id: "diertje", text: "Wil je een eigen diertje? Er wacht een ei op je 🥚", expression: "blij", to: "/diertje", button: "Adopteren" });
  else if (s.pet.careLeft > 0)
    lines.push({
      id: "diertje",
      text: `${s.pet.name} mist je! Nog ${s.pet.careLeft}× aandacht vandaag.`,
      expression: "blij",
      to: "/diertje",
      button: `Naar ${s.pet.name}`,
    });
  if (s.groupUnread > 0)
    lines.push({
      id: "groepen",
      text: s.groupUnread === 1 ? "Er is 1 nieuw bericht in je groepen." : `Er zijn ${s.groupUnread} nieuwe berichten in je groepen.`,
      expression: "blij",
      to: "/community",
      button: "Meepraten",
    });
  if (!s.challengeDone)
    lines.push({ id: "opdracht", text: "Je opdracht van vandaag staat klaar ✍️", expression: "neutraal", to: "/dagboek", button: "Doen" });
  if (s.story && !s.story.read)
    lines.push({
      id: "verhaal",
      text: `Verhaal van de dag: “${s.story.title}”`,
      expression: "neutraal",
      to: "/ontdekken/$articleId",
      storyId: s.story.id,
      button: "Lezen",
    });
  lines.push({
    id: "zinnetje",
    text:
      lines.length === 0 || (lines.length === 1 && lines[0]?.id === "gevoel")
        ? `Alles gedaan voor vandaag, top! 💛 ${s.affirmation}`
        : s.affirmation,
    expression: "blij",
  });
  return lines;
}
