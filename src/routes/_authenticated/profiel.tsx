import { AppLockSettings } from "@/components/AppLock";
import { normalizeUsername, usernameProblem } from "@/lib/username";
import { InstallGuide } from "@/components/InstallGuide";
import { QuietHours, TextSizePicker } from "@/components/ComfortSettings";
import { MyBadges, useBadges } from "@/components/MyBadges";
import { SettingsSection } from "@/components/SettingsSection";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ageGroupFor, useMe, bandLabel } from "@/lib/auth";
import { BADGES } from "@/lib/badges";
import { QUIET_PRESETS } from "@/lib/quiet-hours";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { enablePush, pushMessages } from "@/lib/push-client";
import { UserAvatar } from "@/components/UserAvatar";
import { DeleteAccount } from "@/components/DeleteAccount";
import { ContactAdminsButton } from "@/components/ContactAdminsButton";
import { LegalLinks } from "@/components/LegalPage";
import { Camera, Moon, Sun } from "lucide-react";
import { getTheme, setTheme, type Theme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/profiel")({
  head: () => ({
    meta: [
      { title: "Profiel — CeritaProject" },
      {
        name: "description",
        content: "Je profiel, uiterlijk en privacyinstellingen bij CeritaProject.",
      },
      { property: "og:title", content: "Profiel — CeritaProject" },
      {
        property: "og:description",
        content: "Je profiel, uiterlijk en privacyinstellingen bij CeritaProject.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

/** Quick links to the personal tools, at the top of the profile. */
const SHORTCUTS = [
  { to: "/stemming", emoji: "📅", label: "Stemming" },
  { to: "/complimenten", emoji: "💐", label: "Complimenten" },
  { to: "/rust", emoji: "🫧", label: "Rustmoment" },
  { to: "/veiligheidsplan", emoji: "🛟", label: "Veiligheidsplan" },
  { to: "/brieven", emoji: "💌", label: "Brief aan jezelf" },
  { to: "/vragen", emoji: "🎓", label: "Coaches" },
  { to: "/buddy", emoji: "🤝", label: "Buddy zoeken" },
  { to: "/agenda", emoji: "🗓️", label: "Agenda" },
  { to: "/dankbaar", emoji: "🫙", label: "Dankbaar potje" },
  { to: "/thema", emoji: "✨", label: "Thema" },
  { to: "/meldingen", emoji: "🔔", label: "Meldingen" },
] as const;

function ProfilePage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const p = me?.profile;
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [username, setUsername] = useState("");
  const [theme, setThemeState] = useState<Theme>("light");
  const [open, setOpen] = useState<string | null>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const { earned } = useBadges(p?.id ?? "");

  useEffect(() => setThemeState(getTheme()), []);
  useEffect(() => {
    if (!p) return;
    setName(p.display_name);
    setBio(p.bio ?? "");
    setBirthdate(p.birthdate ?? "");
    setUsername(p.username ?? "");
  }, [p]);

  const toggle = (id: string) => setOpen((cur) => (cur === id ? null : id));

  async function saveProfile() {
    if (!p) return;
    if (!p.birthdate && birthdate) {
      const g = ageGroupFor(new Date(birthdate));
      if (g === "too_young") {
        toast.error("Je moet minimaal 12 jaar zijn.");
        return;
      }
    }
    // Everyone keeps a username: it can change, but not be emptied.
    const uname = normalizeUsername(username);
    const problem = usernameProblem(uname);
    if (problem) {
      toast.error(problem);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        username: uname,
        display_name: name,
        bio,
        ...(p.birthdate ? {} : { birthdate: birthdate || null }),
      })
      .eq("id", p.id);
    if (error) {
      toast.error(
        error.code === "23505" ? "Deze gebruikersnaam is al bezet." : "Opslaan lukte niet",
      );
      return;
    }
    toast.success("Opgeslagen");
    qc.invalidateQueries();
  }
  // Privacy switches save straight away.
  async function setPrivacy(patch: {
    is_private?: boolean;
    allow_messages?: boolean;
    allow_calls?: boolean;
  }) {
    if (!p) return;
    const { error } = await supabase.from("profiles").update(patch).eq("id", p.id);
    toast[error ? "error" : "success"](error ? "Opslaan lukte niet" : "Opgeslagen");
    qc.invalidateQueries();
  }
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  if (!p) return null;
  const quiet = QUIET_PRESETS.find(
    (q) => q.start === (p.quiet_start ?? null) && q.end === (p.quiet_end ?? null),
  );

  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-center gap-4 rounded-3xl bg-card p-4 shadow-soft">
        <label className="relative cursor-pointer" title="Profielfoto wijzigen">
          <UserAvatar path={p.avatar_url} name={p.display_name} size="size-16" userId={p?.id} />
          <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Camera className="size-3.5" />
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const path = `${p.id}/${crypto.randomUUID()}.${f.name.split(".").pop() ?? "jpg"}`;
              const { error } = await supabase.storage
                .from("avatars")
                .upload(path, f, { upsert: true });
              if (error) {
                toast.error("Foto uploaden lukte niet.");
                return;
              }
              const { error: uerr } = await supabase
                .from("profiles")
                .update({ avatar_url: path })
                .eq("id", p.id);
              toast[uerr ? "error" : "success"](
                uerr ? "Opslaan lukte niet" : "Profielfoto bijgewerkt",
              );
              qc.invalidateQueries();
            }}
          />
        </label>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl">{p.display_name}</h1>
          {p.username && <p className="text-sm text-muted-foreground">@{p.username}</p>}
          <p className="text-xs text-muted-foreground">
            {p.birthdate ? `Omgeving ${bandLabel(p.age_group)}` : "Leeftijd nog niet ingevuld"}
            {me?.isAdmin ? " · Beheerder" : me?.isModerator ? " · Moderator" : ""}
          </p>
        </div>
        <button
          onClick={() => {
            setOpen("badges");
            setTimeout(
              () =>
                document
                  .getElementById("instelling-badges")
                  ?.scrollIntoView({ behavior: "smooth" }),
              50,
            );
          }}
          className="shrink-0 rounded-2xl bg-secondary px-3 py-2 text-center text-secondary-foreground"
        >
          <span className="block text-xl">🏅</span>
          <span className="block text-[11px] font-bold">
            {earned.length}/{BADGES.length}
          </span>
        </button>
      </div>

      <section>
        <h2 className="mb-2 text-lg">Voor jou</h2>
        <div className="grid grid-cols-4 gap-2">
          {SHORTCUTS.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="flex flex-col items-center gap-1 rounded-2xl bg-card p-2 text-center shadow-soft active:scale-95"
            >
              <span className="text-2xl">{s.emoji}</span>
              <span className="text-[10px] font-semibold leading-tight">{s.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg">Instellingen</h2>
        <SettingsSection
          id="profiel"
          emoji="👤"
          title="Mijn profiel"
          summary="Naam, gebruikersnaam, over mij"
          open={open === "profiel"}
          onToggle={toggle}
        >
          <div>
            <Label>Naam</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 rounded-2xl"
            />
          </div>
          <div>
            <Label>Gebruikersnaam (verplicht)</Label>
            <div className="mt-1 flex items-center rounded-2xl border border-input bg-background px-3">
              <span className="text-muted-foreground">@</span>
              <input
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))
                }
                maxLength={20}
                placeholder="jouwnaam"
                className="h-10 flex-1 bg-transparent px-1 outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Je naam mag iedereen hebben, je @gebruikersnaam is alleen van jou. Daarmee vinden
              anderen je als buddy of in een chat.
            </p>
          </div>
          <div>
            <Label>Over mij</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={300}
              className="mt-1 rounded-2xl"
            />
          </div>
          <div>
            <Label>Geboortedatum</Label>
            <Input
              type="date"
              value={birthdate}
              disabled={!!p.birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              className="mt-1 rounded-2xl"
            />
            {p.birthdate && (
              <p className="mt-1 text-xs text-muted-foreground">
                Alleen een beheerder kan dit wijzigen.
              </p>
            )}
          </div>
          <Button onClick={saveProfile} className="w-full rounded-full">
            Opslaan
          </Button>
        </SettingsSection>

        <SettingsSection
          id="badges"
          emoji="🏅"
          title="Mijn badges"
          summary={`${earned.length} van de ${BADGES.length} gehaald`}
          open={open === "badges"}
          onToggle={toggle}
        >
          <MyBadges uid={p.id} />
        </SettingsSection>

        <SettingsSection
          id="meldingen"
          emoji="🔔"
          title="Meldingen"
          summary={
            quiet && quiet.start !== null
              ? `Stille uren ${quiet.label}`
              : "Pushmeldingen en stille uren"
          }
          open={open === "meldingen"}
          onToggle={toggle}
        >
          <div className="space-y-2">
            <p className="text-sm font-semibold">📲 Pushmeldingen</p>
            <p className="text-xs text-muted-foreground">
              Krijg een melding op dit apparaat bij nieuwe berichten, complimenten en herinneringen.
            </p>
            <Button
              variant="outline"
              className="w-full rounded-full"
              onClick={async () => {
                try {
                  const r = await enablePush(p.id);
                  (r === "registered" ? toast.success : toast)(pushMessages[r]);
                } catch {
                  toast.error("Meldingen aanzetten lukte niet.");
                }
              }}
            >
              Pushmeldingen aanzetten
            </Button>
          </div>
          <Button
            variant="ghost"
            className="w-full rounded-full text-sm"
            onClick={() => setInstallOpen(true)}
          >
            📲 Hoe zet ik de app op mijn beginscherm?
          </Button>
          <InstallGuide open={installOpen} onOpenChange={setInstallOpen} />
          <QuietHours
            uid={p.id}
            quietStart={p.quiet_start ?? null}
            quietEnd={p.quiet_end ?? null}
          />
        </SettingsSection>

        <SettingsSection
          id="uiterlijk"
          emoji="🎨"
          title="Uiterlijk"
          summary={`${theme === "dark" ? "Donker" : "Licht"} scherm · lettergrootte`}
          open={open === "uiterlijk"}
          onToggle={toggle}
        >
          <div className="space-y-2">
            <p className="text-sm font-semibold">🌗 Licht of donker</p>
            <div className="grid grid-cols-2 gap-2">
              {(["light", "dark"] as Theme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTheme(t);
                    setThemeState(t);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-full border-2 px-4 py-2.5 text-sm font-semibold transition-colors ${theme === t ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground"}`}
                >
                  {t === "light" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                  {t === "light" ? "Licht" : "Donker"}
                </button>
              ))}
            </div>
          </div>
          <TextSizePicker />
          <p className="text-xs text-muted-foreground">
            Deze keuzes gelden alleen voor dit apparaat.
          </p>
        </SettingsSection>

        <SettingsSection
          id="privacy"
          emoji="🔒"
          title="Privacy en veiligheid"
          summary="Wie je mag berichten en bellen, slot op de app"
          open={open === "privacy"}
          onToggle={toggle}
        >
          <label className="flex items-center justify-between gap-4 text-sm">
            Privéprofiel (alleen volgers zien je verhalen)
            <Switch checked={p.is_private} onCheckedChange={(v) => setPrivacy({ is_private: v })} />
          </label>
          <label className="flex items-center justify-between gap-4 text-sm">
            Berichten van connecties toestaan
            <Switch
              checked={p.allow_messages}
              onCheckedChange={(v) => setPrivacy({ allow_messages: v })}
            />
          </label>
          <label className="flex items-center justify-between gap-4 text-sm">
            Bellen en videobellen toestaan (alleen in geaccepteerde chats)
            <Switch
              checked={p.allow_calls}
              onCheckedChange={(v) => setPrivacy({ allow_calls: v })}
            />
          </label>
          <div className="border-t border-border/40 pt-4">
            <p className="mb-2 text-sm font-semibold">🔐 Slot op de app</p>
            <AppLockSettings bare />
          </div>
        </SettingsSection>

        <SettingsSection
          id="hulp"
          emoji="💬"
          title="Hulp en contact"
          summary="Bericht aan de beheerders, hulplijnen, regels"
          open={open === "hulp"}
          onToggle={toggle}
        >
          <ContactAdminsButton uid={p.id} />
          <Link to="/hulp" className="block rounded-2xl bg-muted p-3 text-sm font-semibold">
            🆘 Hulplijnen: wie kun je bellen?
          </Link>
          <LegalLinks className="text-muted-foreground" />
        </SettingsSection>

        <SettingsSection
          id="account"
          emoji="🚪"
          title="Account"
          summary="Uitloggen of je account verwijderen"
          open={open === "account"}
          onToggle={toggle}
        >
          <Button onClick={signOut} variant="outline" className="h-12 w-full rounded-full">
            Uitloggen
          </Button>
          <DeleteAccount />
        </SettingsSection>
      </section>
    </div>
  );
}
