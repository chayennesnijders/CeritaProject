/** Counts from my_badge_stats() plus the mood streak worked out in the app. */
export type BadgeStats = {
  stories: number;
  diary: number;
  moods: number;
  mood_streak: number;
  games_won: number;
  compliments_sent: number;
  compliments_received: number;
  challenges: number;
  groups_made: number;
  pet_xp: number;
};

export const BADGES: {
  id: string;
  emoji: string;
  name: string;
  how: string;
  earned: (s: BadgeStats) => boolean;
}[] = [
  {
    id: "eerste-gevoel",
    emoji: "🌱",
    name: "Eerste stapje",
    how: "Vul je stemming in",
    earned: (s) => s.moods >= 1,
  },
  {
    id: "week-gevoel",
    emoji: "📅",
    name: "Weekje volgehouden",
    how: "7 dagen op rij je stemming",
    earned: (s) => s.mood_streak >= 7,
  },
  {
    id: "maand-gevoel",
    emoji: "🗓️",
    name: "Een hele maand",
    how: "30 keer je stemming ingevuld",
    earned: (s) => s.moods >= 30,
  },
  {
    id: "schrijver",
    emoji: "📔",
    name: "Schrijver",
    how: "10 keer in je dagboek",
    earned: (s) => s.diary >= 10,
  },
  {
    id: "verteller",
    emoji: "✍️",
    name: "Verteller",
    how: "Stuur je eigen verhaal in",
    earned: (s) => s.stories >= 1,
  },
  {
    id: "speler",
    emoji: "🎮",
    name: "Spelletjeskampioen",
    how: "Win 10 spelletjes in de chat",
    earned: (s) => s.games_won >= 10,
  },
  {
    id: "complimentje",
    emoji: "💐",
    name: "Complimentengever",
    how: "Stuur 10 complimenten",
    earned: (s) => s.compliments_sent >= 10,
  },
  {
    id: "geliefd",
    emoji: "💖",
    name: "Geliefd",
    how: "Krijg 10 complimenten",
    earned: (s) => s.compliments_received >= 10,
  },
  {
    id: "teamspeler",
    emoji: "🤝",
    name: "Teamspeler",
    how: "Haal een weekuitdaging met je groep",
    earned: (s) => s.challenges >= 1,
  },
  {
    id: "oprichter",
    emoji: "👥",
    name: "Oprichter",
    how: "Maak je eigen groep",
    earned: (s) => s.groups_made >= 1,
  },
  {
    id: "dierenvriend",
    emoji: "🐾",
    name: "Dierenvriend",
    how: "Verdien 500 XP met je diertje",
    earned: (s) => s.pet_xp >= 500,
  },
];

export const earnedBadges = (s: BadgeStats) => BADGES.filter((b) => b.earned(s));
