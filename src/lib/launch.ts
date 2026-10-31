/** One item on the "ready to go live?" list in Beheer. ok: true = done, false = still to do, null = check yourself. */
export type LaunchCheck = {
  id: string;
  group: "Techniek" | "Database" | "Inhoud" | "Zelf regelen";
  label: string;
  ok: boolean | null;
  required: boolean;
  how: string;
};

/** What the server can see (only yes/no, never the keys themselves). */
export type ServerChecks = {
  serviceRole: boolean;
  firebaseServer: boolean;
  /** Names of push settings that are missing or wrong (never values). */
  pushProblems?: string[];
  where?: {
    env: string | null;
    project: string | null;
    branch: string | null;
    firebaseNames: string[];
  };
  resend: boolean;
  emailHook: boolean;
  stripeLive: boolean;
  openai: boolean;
  updates: Record<string, boolean>;
  playlists: number;
  articles: number;
  upcomingEvents: number;
};
/** What the browser can see. */
export type ClientChecks = {
  firebaseClient: boolean;
  stripeLiveClient: boolean;
  host: string;
  kvk: boolean;
};

export const LIVE_HOST = "app.ceritaproject.nl";

/** Database updates to paste in Supabase, each with something the app can look for. */
export const DB_UPDATES = [
  { id: "18-21", label: "Updates 18 t/m 21 (spelletjes, eigen groepen)" },
  { id: "22", label: "Update 22 (reacties, peilingen, complimenten)" },
  { id: "23-24", label: "Updates 23 en 24 (muziek)" },
  { id: "25", label: "Update 25 (veiligheidsplan, vragen, agenda)" },
] as const;

/** "The app runs in Vercel project X (Production) and sees these Firebase names: …" */
function whereText(w: ServerChecks["where"]) {
  if (!w) return "";
  const env =
    w.env === "production" ? "Production" : w.env === "preview" ? "Preview" : (w.env ?? "?");
  const names = w.firebaseNames.length ? w.firebaseNames.join(", ") : "geen enkele";
  return ` De app draait in Vercel-project ${w.project ?? "?"} (omgeving: ${env}${w.branch ? `, branch ${w.branch}` : ""}) en ziet deze Firebase-namen: ${names}. Staan je sleutels in een ander project of alleen bij een andere omgeving? Zet ze dan hier.`;
}

export function launchChecks(s: ServerChecks, c: ClientChecks): LaunchCheck[] {
  return [
    {
      id: "domein",
      group: "Techniek",
      label: `De app draait op ${LIVE_HOST}`,
      ok: c.host === LIVE_HOST,
      required: true,
      how: `Open de app via https://${LIVE_HOST}.`,
    },
    {
      id: "server",
      group: "Techniek",
      label: "Supabase-sleutel voor de server",
      ok: s.serviceRole,
      required: true,
      how: "Vercel → Settings → Environment Variables: SUPABASE_SERVICE_ROLE_KEY.",
    },
    {
      id: "push",
      group: "Techniek",
      label: "Pushmeldingen (Firebase)",
      ok: s.firebaseServer && c.firebaseClient,
      required: true,
      how: s.pushProblems?.length
        ? `Dit klopt nog niet in Vercel: ${s.pushProblems.join("; ")}.${whereText(s.where)}`
        : "Zet de 4 VITE_FIREBASE_-sleutels en FIREBASE_SERVICE_ACCOUNT in Vercel en doe een Redeploy.",
    },
    {
      id: "mail",
      group: "Techniek",
      label: "E-mails (Resend)",
      ok: s.resend && s.emailHook,
      required: true,
      how: "Zet RESEND_API_KEY, EMAIL_FROM en SEND_EMAIL_HOOK_SECRET in Vercel en zet de Send Email Hook aan in Supabase.",
    },
    {
      id: "stripe",
      group: "Techniek",
      label: "Echte betalingen in de shop (Stripe live)",
      ok: s.stripeLive && c.stripeLiveClient,
      required: true,
      how: "Zet de live-sleutels (pk_live_… en sk_live_…) in Vercel. Nu staat de shop nog in testmodus.",
    },
    {
      id: "ai",
      group: "Techniek",
      label: "Spraak naar tekst en hulp bij meldingen (OpenAI)",
      ok: s.openai,
      required: false,
      how: "Zet OPENAI_API_KEY in Vercel. Zonder werkt de rest gewoon.",
    },
    ...DB_UPDATES.map((u) => ({
      id: `db-${u.id}`,
      group: "Database" as const,
      label: u.label,
      ok: s.updates[u.id] ?? false,
      required: true,
      how: "Plak de update in Supabase → SQL Editor → Run, in volgorde.",
    })),
    {
      id: "artikelen",
      group: "Inhoud",
      label: `Verhalen en artikelen (${s.articles})`,
      ok: s.articles >= 5,
      required: true,
      how: "Zet minstens 5 verhalen of artikelen klaar bij Ontdekken.",
    },
    {
      id: "playlists",
      group: "Inhoud",
      label: `Playlists bij Muziek (${s.playlists})`,
      ok: s.playlists >= 1,
      required: false,
      how: "Voeg een playlist toe bij Beheer → Muziek.",
    },
    {
      id: "agenda",
      group: "Inhoud",
      label: `Geplande meetups (${s.upcomingEvents})`,
      ok: s.upcomingEvents >= 1,
      required: false,
      how: "Plan een eerste meetup bij Beheer → Agenda.",
    },
    {
      id: "kvk",
      group: "Zelf regelen",
      label: "KvK-nummer in de voorwaarden",
      ok: c.kvk,
      required: false,
      how: "Stuur het KvK-nummer, dan zet ik het erin.",
    },
    {
      id: "test",
      group: "Zelf regelen",
      label: "Getest met een paar echte jongeren",
      ok: null,
      required: false,
      how: "Laat 3–5 jongeren een week meedoen en vraag wat ze ervan vinden.",
    },
    {
      id: "stores",
      group: "Zelf regelen",
      label: "App Store / Google Play",
      ok: null,
      required: false,
      how: "Niet nodig om live te gaan: de app werkt al via de browser en op het beginscherm.",
    },
  ];
}

/** Ready when every required item is done. */
export function launchStatus(checks: LaunchCheck[]) {
  const required = checks.filter((c) => c.required);
  const done = required.filter((c) => c.ok === true).length;
  return { ready: done === required.length, done, total: required.length };
}
