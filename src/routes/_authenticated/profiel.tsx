import { AppLockSettings } from "@/components/AppLock";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ageGroupFor, useMe, bandLabel } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { enablePush, pushMessages } from "@/lib/push-client";
import { UserAvatar } from "@/components/UserAvatar";
import { DeleteAccount } from "@/components/DeleteAccount";
import { ContactAdminsButton } from "@/components/ContactAdminsButton";
import { Camera, Moon, Sun } from "lucide-react";
import { getTheme, setTheme, type Theme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/profiel")({
  head: () => ({ meta: [{ title: "Profiel — CeritaProject" }, { name: "description", content: "Je profiel, uiterlijk en privacyinstellingen bij CeritaProject." }, { property: "og:title", content: "Profiel — CeritaProject" }, { property: "og:description", content: "Je profiel, uiterlijk en privacyinstellingen bij CeritaProject." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const p = me?.profile;
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [priv, setPriv] = useState(true);
  const [msgs, setMsgs] = useState(false);
  const [calls, setCalls] = useState(false);
  const [username, setUsername] = useState("");
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => setThemeState(getTheme()), []);

  useEffect(() => {
    if (!p) return;
    setName(p.display_name); setBio(p.bio ?? ""); setBirthdate(p.birthdate ?? "");
    setPriv(p.is_private); setMsgs(p.allow_messages); setCalls(p.allow_calls); setUsername(p.username ?? "");
  }, [p]);

  async function save() {
    if (!p) return;
    if (!p.birthdate && birthdate) {
      const g = ageGroupFor(new Date(birthdate));
      if (g === "too_young") { toast.error("Je moet minimaal 12 jaar zijn."); return; }
    }
    const uname = username.trim().toLowerCase().replace(/^@/, "");
    if (uname && !/^[a-z0-9_.]{3,20}$/.test(uname)) { toast.error("Gebruikersnaam: 3 tot 20 tekens, alleen letters, cijfers, _ en ."); return; }
    const { error } = await supabase.from("profiles").update({
      username: uname || null,
      display_name: name, bio, is_private: priv, allow_messages: msgs, allow_calls: calls,
      ...(p.birthdate ? {} : { birthdate: birthdate || null }),
    }).eq("id", p.id);
    if (error) { toast.error(error.code === "23505" ? "Deze gebruikersnaam is al bezet." : "Opslaan lukte niet"); return; }
    toast.success("Opgeslagen");
    qc.invalidateQueries();
  }
  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  if (!p) return null;
  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-center gap-4">
        <label className="relative cursor-pointer" title="Profielfoto wijzigen">
          <UserAvatar path={p.avatar_url} name={p.display_name} size="size-16" userId={p?.id} />
          <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"><Camera className="size-3.5" /></span>
          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const path = `${p.id}/${crypto.randomUUID()}.${f.name.split(".").pop() ?? "jpg"}`;
            const { error } = await supabase.storage.from("avatars").upload(path, f, { upsert: true });
            if (error) { toast.error("Foto uploaden lukte niet."); return; }
            const { error: uerr } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", p.id);
            toast[uerr ? "error" : "success"](uerr ? "Opslaan lukte niet" : "Profielfoto bijgewerkt");
            qc.invalidateQueries();
          }} />
        </label>
        <div>
          <h1 className="text-2xl">{p.display_name}</h1>
          {p.username && <p className="text-sm text-muted-foreground">@{p.username}</p>}
          <p className="text-xs text-muted-foreground">{p.birthdate ? `Omgeving ${bandLabel(p.age_group)}` : "Leeftijd nog niet ingevuld"}{me?.isAdmin && " · Beheerder"}</p>
        </div>
      </div>
      <div className="space-y-4 rounded-3xl bg-card p-5 shadow-soft">
        <div><Label>Naam</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 rounded-2xl" /></div>
        <div>
          <Label>Gebruikersnaam</Label>
          <div className="mt-1 flex items-center rounded-2xl border border-input bg-background px-3">
            <span className="text-muted-foreground">@</span>
            <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))} maxLength={20} placeholder="jouwnaam" className="h-10 flex-1 bg-transparent px-1 outline-none" />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Hiermee kunnen anderen je vinden bij Berichten.</p>
        </div>
        <div><Label>Over mij</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} className="mt-1 rounded-2xl" /></div>
        <div>
          <Label>Geboortedatum</Label>
          <Input type="date" value={birthdate} disabled={!!p.birthdate} onChange={(e) => setBirthdate(e.target.value)} className="mt-1 rounded-2xl" />
          {p.birthdate && <p className="mt-1 text-xs text-muted-foreground">Alleen een beheerder kan dit wijzigen.</p>}
        </div>
      </div>
      <AppLockSettings />
      <div className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="text-lg">Uiterlijk</h2>
        <p className="text-sm text-muted-foreground">Kies een licht of donker scherm. Geldt alleen voor dit apparaat.</p>
        <div className="grid grid-cols-2 gap-2">
          {(["light", "dark"] as Theme[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTheme(t); setThemeState(t); }}
              className={`flex items-center justify-center gap-2 rounded-full border-2 px-4 py-2.5 text-sm font-semibold transition-colors ${theme === t ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground"}`}
            >
              {t === "light" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              {t === "light" ? "Licht" : "Donker"}
            </button>
          ))}
        </div>
      </div>
      <ContactAdminsButton uid={p.id} />
      <div className="space-y-4 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="text-lg">Privacy</h2>
        <label className="flex items-center justify-between gap-4 text-sm">Privéprofiel (alleen volgers zien je verhalen)<Switch checked={priv} onCheckedChange={setPriv} /></label>
        <label className="flex items-center justify-between gap-4 text-sm">Berichten van connecties toestaan<Switch checked={msgs} onCheckedChange={setMsgs} /></label>
        <label className="flex items-center justify-between gap-4 text-sm">Bellen en videobellen toestaan (alleen in geaccepteerde chats)<Switch checked={calls} onCheckedChange={setCalls} /></label>
      </div>
      <div className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="text-lg">Meldingen</h2>
        <p className="text-sm text-muted-foreground">Krijg een melding op dit apparaat als iemand je een chatverzoek stuurt.</p>
        <Button variant="outline" className="w-full rounded-full" onClick={async () => {
          try {
            const r = await enablePush(p.id);
            (r === "registered" ? toast.success : toast)(pushMessages[r]);
          } catch { toast.error("Meldingen aanzetten lukte niet."); }
        }}>Pushmeldingen aanzetten</Button>
      </div>
      <Button onClick={save} className="h-12 w-full rounded-full">Opslaan</Button>
      <Button onClick={signOut} variant="outline" className="h-12 w-full rounded-full">Uitloggen</Button>
      <DeleteAccount />
    </div>
  );
}
