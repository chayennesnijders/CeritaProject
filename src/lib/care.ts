/**
 * Words about suicide or self-harm. A match shows the writer where to find help, and the database
 * (public.needs_care, same pattern) flags it for the admins so someone can reach out.
 * Kept to constructs that mean the same in JavaScript and PostgreSQL regular expressions.
 */
export const CARE_PATTERN =
  "(zelfmoord|zelfdoding|su[iï]cid|zelfbeschadig|zelfverwond" +
  "|dood\\s+(gaan\\s+)?willen|wil\\s+(\\S+\\s+){0,2}dood" +
  "|er\\s+niet\\s+meer\\s+(wil\\s+|willen\\s+)?zijn|niet\\s+meer\\s+(willen\\s+)?leven" +
  "|zie\\s+het\\s+(\\S+\\s+){0,2}niet\\s+meer\\s+zitten" +
  "|mezelf\\s+(\\S+\\s+){0,2}(snijden|gesneden|pijn\\s+doen|iets\\s+aan\\s*doen|van\\s+kant\\s+maken|ophangen)" +
  "|snij\\S*\\s+(\\S+\\s+){0,2}mezelf|einde\\s+aan\\s+(mijn|m'?n)\\s+leven" +
  "|niemand\\s+zou\\s+me\\s+missen|beter\\s+af\\s+zonder\\s+mij)";

const re = new RegExp(CARE_PATTERN, "i");
export const needsCare = (text: string | null | undefined) => re.test(text ?? "");

/** Ask the app to show the help dialog (it is mounted once in the app shell). */
export const showCareHelp = () => window.dispatchEvent(new Event("cerita-care-help"));
