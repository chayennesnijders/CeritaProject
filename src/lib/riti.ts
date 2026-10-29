import type { MoodId } from "@/lib/home";

/** Riti's emotions from her character sheet that the app shows (drawings in public/riti). */
export type RitiExpression = "neutraal" | "blij" | "troostend" | "denkend" | "trots";

export const ritiImage = (e: RitiExpression) => `/riti/${e === "neutraal" ? "riti" : e}.webp`;

/** How Riti reacts to how you feel: proud and happy with you, and comforting with a heart when it is hard. */
export function ritiFor(mood: MoodId | null): RitiExpression {
  switch (mood) {
    case "super":
      return "trots";
    case "goed":
      return "blij";
    case "gaat-wel":
      return "denkend";
    case "verdrietig":
    case "gestrest":
      return "troostend";
    default:
      return "neutraal";
  }
}
