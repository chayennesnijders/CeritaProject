/**
 * The age someone turns today, or null when it isn't their birthday.
 * `day` is today's Dutch date (YYYY-MM-DD); 29 February birthdays are celebrated on 28 February in other years.
 */
export function birthdayAge(birthdate: string, day: string): number | null {
  const [by, bm, bd] = birthdate.slice(0, 10).split("-").map(Number);
  const [ty, tm, td] = day.split("-").map(Number);
  if (!by || !bm || !bd || !ty || !tm || !td) return null;
  const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const celebrateDay = bm === 2 && bd === 29 && !leap(ty) ? 28 : bd;
  return bm === tm && celebrateDay === td && ty > by ? ty - by : null;
}
