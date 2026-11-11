/**
 * Teachers have their own account type (profiles.is_teacher, set only through become_teacher(code)
 * with a working school code). Like parents they have no birthdate, so they never reach groups,
 * chats, other profiles or CeritaBuddy. In the app they only see their lessons and their profile.
 */

/** Pages a teacher may open. Everything else in the app is for young people. */
export const TEACHER_PAGES = ["/home", "/profiel", "/beheer"] as const;
export const teacherMayOpen = (path: string) =>
  TEACHER_PAGES.some((p) => path === p || path.startsWith(`${p}/`));

/** Lessons first: unlocked ones before locked ones, each in the order the admin set. */
export function sortForTeacher<T extends { unlocked: boolean }>(lessons: readonly T[]): T[] {
  return [...lessons.filter((l) => l.unlocked), ...lessons.filter((l) => !l.unlocked)];
}

/** "31 juli 2027" for a licence end date (YYYY-MM-DD). */
export const licenceEnd = (day: string) =>
  new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
