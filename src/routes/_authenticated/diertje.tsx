import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { CARE_ACTIONS, PET_SPECIES, extraPetSlots, petDay, careUnlocked, speciesEmoji, levelFor, moodFor, BACKGROUNDS, OUTFITS, isUnlocked, unlocksAt, todoPopupKey, shouldAutoOpenTodoPopup, type Unlockable } from "@/lib/pet";
import { useEffect, useRef } from "react";
import { PetAvatar, growthStage, STAGE_LABELS } from "@/components/PetAvatar";
import { PetGames } from "@/components/PetGames";
import { DailyTodoPopup } from "@/components/DailyTodoPopup";
import { PetScene } from "@/components/PetScene";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";


export const Route = createFileRoute("/_authenticated/diertje")({
  head: () => ({
    meta: [
      { title: "Mijn diertje — CeritaProject" },
      { name: "description", content: "Verzorg je virtuele diertje en zie het groeien, zonder straf als je een dag overslaat." },
      { property: "og:title", content: "Mijn diertje — CeritaProject" },
      { property: "og:description", content: "Verzorg je virtuele diertje en zie het groeien." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PetPage,
});

const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function PetPage() {
  const { data: me } = useMe();
  const uid = me?.user?.id ?? me?.profile?.id;
  const qc = useQueryClient();
  const now = new Date();
  const today = petDay(now);
  const monthStart = localDate(new Date(now.getFullYear(), now.getMonth(), 1));

  const { data: pet, isLoading } = useQuery({
    queryKey: ["pet", uid],
    enabled: !!uid,
    queryFn: async () => (await supabase.from("pets").select("*").eq("user_id", uid!).maybeSingle()).data,
  });
  const { data: care = [] } = useQuery({
    queryKey: ["pet-care", uid, monthStart],
    enabled: !!uid,
    queryFn: async () => (await supabase.from("pet_care").select("care_date, action").eq("user_id", uid!).gte("care_date", monthStart)).data ?? [],
  });

  const [jumping, setJumping] = useState(false);
  const [fx, setFx] = useState<{ id: number; emoji: string; cls: string }[]>([]);
  const [activeRef, setActiveRef] = useState("main");
  const [listId, setListId] = useState<string | null>(null);
  const [todoOpen, setTodoOpen] = useState(false);
  const [panel, setPanel] = useState<PanelId>("taken");
  // Explains why caring is still locked when you tap a locked button.
  const [lockedOpen, setLockedOpen] = useState(false);
  const [adopting, setAdopting] = useState(false);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [ball, setBall] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const hugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: companions = [] } = useQuery({
    queryKey: ["pet-companions", uid],
    enabled: !!uid,
    queryFn: async () => (await supabase.from("companions").select("*").eq("user_id", uid!).order("created_at")).data ?? [],
  });
  const { data: lists = [], isLoading: listsLoading } = useQuery({
    queryKey: ["pet-lists", uid],
    enabled: !!uid,
    queryFn: async () => (await supabase.from("pet_lists").select("*").eq("user_id", uid!).order("created_at")).data ?? [],
  });
  const { data: todos = [], isLoading: todosLoading } = useQuery({
    queryKey: ["pet-todos", uid],
    enabled: !!uid,
    queryFn: async () => (await supabase.from("pet_todos").select("*").eq("user_id", uid!).not("list_id", "is", null).order("created_at")).data ?? [],
  });

  // Elke ochtend (na 07:00) popt het dagtakenlijstje vanzelf op, één keer per dag per diertje per toestel.
  useEffect(() => {
    if (listsLoading || todosLoading) return;
    const own = new Set(lists.filter((l) => l.pet_ref === activeRef).map((l) => l.id));
    const count = todos.filter((t) => t.todo_date === today && t.list_id && own.has(t.list_id)).length;
    const key = todoPopupKey(activeRef, today);
    if (shouldAutoOpenTodoPopup(count, !!localStorage.getItem(key))) {
      localStorage.setItem(key, "1");
      setTodoOpen(true);
    }
  }, [listsLoading, todosLoading, lists, todos, activeRef, today]);
  function burst(emoji: string, cls = "pet-float") {
    const id = Date.now() + Math.random();
    setFx((f) => [...f, { id, emoji, cls }]);
    setJumping(false); requestAnimationFrame(() => setJumping(true));
    setTimeout(() => setFx((f) => f.filter((x) => x.id !== id)), 1300);
    setTimeout(() => setJumping(false), 750);
  }
  const refresh = () => { qc.invalidateQueries({ queryKey: ["pet", uid] }); qc.invalidateQueries({ queryKey: ["pet-care", uid] }); qc.invalidateQueries({ queryKey: ["pet-todos", uid] }); qc.invalidateQueries({ queryKey: ["pet-lists", uid] }); qc.invalidateQueries({ queryKey: ["pet-companions", uid] }); };

  useLevelUpToast(pet ? levelFor(pet.xp).level : null);
  if (isLoading || !uid) return <p className="pt-6 text-muted-foreground">Laden…</p>;
  if (!pet) return <Adopt uid={uid} onDone={refresh} />;

  const doneToday = care.filter((c) => c.care_date === today).map((c) => c.action);
  const { level, progress } = levelFor(pet.xp);
  const careDays = new Set(care.map((c) => c.care_date));
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const offset = (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + 6) % 7;

  const companion = companions.find((c) => c.id === activeRef);
  const active = companion ?? pet;
  const petLists = lists.filter((l) => l.pet_ref === (companion ? companion.id : "main"));
  const currentList = petLists.find((l) => l.id === listId) ?? petLists[0];
  const listTodos = todos.filter((t) => t.list_id === currentList?.id && t.todo_date === today);
  const todayTasks = todos.filter((t) => t.todo_date === today && petLists.some((l) => l.id === t.list_id)).length;
  const canCare = careUnlocked(todayTasks);
  const freeSlots = extraPetSlots(level) - companions.length;
  const nextPetLevel = 3 + companions.length * 2;
  const doneTodos = todos.filter((t) => t.done && t.todo_date === today && petLists.some((l) => l.id === t.list_id)).length;
  const happiness = doneToday.length + doneTodos;
  const mood = happiness >= 3 ? "super" : happiness >= 1 ? "blij" : "slaap";

  // Verjaardag van een diertje = de dag waarop het geadopteerd is (niet de adoptiedag zelf).
  const isBirthday = (iso: string) => {
    const d = new Date(iso);
    return d.getMonth() === now.getMonth() && d.getDate() === now.getDate() && d.getFullYear() < now.getFullYear();
  };
  const birthdayPets = [
    ...(isBirthday(pet.created_at) ? [{ name: pet.name, since: pet.created_at }] : []),
    ...companions.filter((c) => isBirthday(c.created_at)).map((c) => ({ name: c.name, since: c.created_at })),
  ];

  const bg = BACKGROUNDS.find((b) => b.id === pet.background) ?? BACKGROUNDS[0]!;
  async function choose(field: "background" | "outfit", id: string) {
    if (field === "outfit" && companion) await supabase.from("companions").update({ outfit: id }).eq("id", companion.id);
    else await supabase.from("pets").update({ [field]: id } as { background?: string; outfit?: string }).eq("user_id", uid!);
    burst("✨"); refresh();
  }

  async function doCare(action: string, emoji: string) {
    const { error } = await supabase.from("pet_care").insert({ user_id: uid!, action, care_date: today });
    if (error) toast.error("Dat lukte niet, probeer het opnieuw.");
    else { burst(emoji, "pet-eat"); setTimeout(() => burst("💖"), 600); refresh(); }
  }
  const eatDone = doneToday.includes("eten"), playDone = doneToday.includes("spelen"), hugDone = doneToday.includes("knuffel");
  function dropFood(x: number, y: number) {
    setDrag(null);
    const r = stageRef.current?.getBoundingClientRect();
    if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { if (!eatDone) doCare("eten", "🍓"); else burst("😋"); }
    else toast("Sleep het eten naar je diertje 🍓");
  }
  function throwBall() {
    setBall(Date.now());
    setTimeout(() => { burst("🎾"); if (!playDone && canCare) doCare("spelen", "⭐"); }, 900);
  }
  function startHug() {
    hugTimer.current = setTimeout(() => {
      burst("🤗", "pet-float"); setTimeout(() => burst("💞"), 300); setTimeout(() => burst("💖"), 600);
      if (!hugDone && canCare) doCare("knuffel", "🤗");
    }, 700);
  }
  function endHug() { if (hugTimer.current) clearTimeout(hugTimer.current); hugTimer.current = null; }
  async function addTodo(title: string) {
    const t = title.trim();
    if (!t || !currentList) return;
    await supabase.from("pet_todos").insert({ user_id: uid!, title: t, list_id: currentList.id, todo_date: today });
    refresh();
  }
  async function toggleTodo(id: string, done: boolean, rewarded: boolean) {
    await supabase.from("pet_todos").update({ done }).eq("id", id);
    if (done) burst(rewarded ? "✨" : "⭐");
    refresh();
  }
  async function addList(title: string) {
    const t = title.trim(); if (!t) return;
    const { data } = await supabase.from("pet_lists").insert({ user_id: uid!, title: t, pet_ref: companion ? companion.id : "main" }).select("id").single();
    if (data) setListId(data.id);
    refresh();
  }
  async function removeList(id: string) {
    if (!uid) return false;
    const { data: removed, error } = await supabase.from("pet_lists").delete().eq("id", id).eq("user_id", uid).select("id");
    if (error || !removed?.length) { toast.error(error?.message ?? "Lijstje kon niet worden verwijderd."); return false; }
    setListId(null); refresh(); toast.success("Lijstje verwijderd"); return true;
  }
  async function removeTodo(id: string) {
    if (!uid) return;
    const { error } = await supabase.from("pet_todos").delete().eq("id", id).eq("user_id", uid);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  return (
    <div className="space-y-5 pt-2">
      <h1 className="text-3xl">Mijn diertjes</h1>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {[{ id: "main", species: pet.species, name: pet.name }, ...companions].map((c) => (
          <button key={c.id} onClick={() => { setActiveRef(c.id); setListId(null); }}
            className={`shrink-0 rounded-2xl px-3 py-2 text-center ${activeRef === c.id ? "bg-accent ring-2 ring-primary" : "bg-card shadow-soft"}`}>
            <p className="text-2xl">{speciesEmoji(c.species)}</p><p className="max-w-16 truncate text-xs">{c.name}</p>
          </button>
        ))}
        {freeSlots > 0 ? (
          <button onClick={() => setAdopting(true)} className="shrink-0 rounded-2xl border-2 border-dashed border-primary px-3 py-2 text-center">
            <p className="text-2xl">➕</p><p className="text-xs">Nieuw!</p>
          </button>
        ) : (
          <div className="shrink-0 rounded-2xl bg-muted px-3 py-2 text-center opacity-60">
            <p className="text-2xl">🔒</p><p className="text-xs">Level {nextPetLevel}</p>
          </div>
        )}
      </div>
      {adopting && (
        <div className="rounded-3xl bg-card p-4 shadow-soft">
          <Adopt uid={uid} companion onDone={() => { setAdopting(false); refresh(); }} />
          <button onClick={() => setAdopting(false)} className="mt-2 w-full text-sm text-muted-foreground">Annuleren</button>
        </div>
      )}
      <div ref={stageRef} className="relative min-h-[330px] touch-pan-y select-none overflow-hidden rounded-3xl p-6 text-center shadow-soft" style={{ background: bg.css }}>
        <PetScene id={bg.id} />

        {/* relative z-10: the scene (clouds, fence) is absolutely positioned and would otherwise cover the ears. */}
        <div className="relative z-10" onPointerDown={startHug} onPointerUp={endHug} onPointerLeave={endHug} onPointerCancel={endHug}>
          <PetAvatar outfit={active.outfit} species={active.species} mood={mood} jumping={jumping} onTap={() => burst("💕")} level={level} />
        </div>
        {ball > 0 && <span key={ball} className="pet-ball pointer-events-none absolute bottom-24 left-0 text-4xl">🎾</span>}
        {fx.map((f) => (
          <span key={f.id} className={`${f.cls} pointer-events-none absolute left-1/2 text-4xl`} style={{ bottom: f.cls === "pet-eat" ? 90 : 200, marginLeft: -18 }}>{f.emoji}</span>
        ))}
        {/* Naamkaartje: dikke zwarte letters op crème, zodat de naam altijd goed leesbaar is */}
        <div className="relative z-10 mt-1 flex justify-center">
          <div className="inline-block rounded-2xl border-2 border-border bg-card px-5 py-2 text-card-foreground shadow-soft">
            <p className="font-display text-2xl font-extrabold leading-tight">{active.name}</p>
            <p className="mt-0.5 text-sm font-semibold">{moodFor(happiness)}</p>
          </div>
        </div>
      </div>

      {/* Level en punten staan buiten het plaatje, op de crème achtergrond */}
      <div className="space-y-2 text-center">
        <p className="text-sm font-bold uppercase tracking-widest">Level {level} · {STAGE_LABELS[growthStage(level)]}</p>
        <div className="mx-auto h-2 max-w-xs overflow-hidden rounded-full bg-muted ring-1 ring-foreground/20">
          <div className="h-full bg-primary transition-all" style={{ width: `max(7%, ${progress * 100}%)` }} />
        </div>
      </div>

      {birthdayPets.map((b) => (
        <div key={b.name} className="rounded-3xl bg-secondary p-5 text-center text-secondary-foreground shadow-soft">
          <p className="text-4xl">🎁</p>
          <p className="mt-2 font-display text-xl">Gefeliciteerd, {b.name}!</p>
          <p className="mt-1 text-sm opacity-85">
            Vandaag is {b.name} precies {now.getFullYear() - new Date(b.since).getFullYear()} jaar bij jou. Tijd voor een feestje! 🎉
          </p>
        </div>
      ))}

      {!canCare && (
        <div className="rounded-3xl bg-secondary p-4 text-center text-sm text-secondary-foreground shadow-soft">
          🌅 Nieuwe dag! Vul eerst je to-do lijstje van vandaag in (minstens één taak) — daarna kun je {active.name} verzorgen.
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        {CARE_ACTIONS.map((a) => {
          const done = doneToday.includes(a.id);
          return (
            <button key={a.id} disabled={done} aria-disabled={!canCare}
              onClick={() => { if (!canCare) { setLockedOpen(true); return; } if (a.id === "spelen") throwBall(); else if (a.id !== "eten") doCare(a.id, a.emoji); }}
              onPointerDown={(e) => { if (a.id === "eten" && !done && canCare) { e.currentTarget.setPointerCapture(e.pointerId); setDrag({ x: e.clientX, y: e.clientY }); } }}
              onPointerMove={(e) => { if (a.id === "eten" && drag) setDrag({ x: e.clientX, y: e.clientY }); }}
              onPointerUp={(e) => { if (a.id === "eten" && drag) dropFood(e.clientX, e.clientY); }}
              style={a.id === "eten" ? { touchAction: "none" } : undefined}
              className={`rounded-3xl bg-card p-4 text-center shadow-soft transition active:scale-95 disabled:opacity-50 ${canCare ? "" : "opacity-60"}`}>
              <p className="text-2xl">{a.emoji}</p>
              <p className="mt-1 text-xs font-semibold">{done ? "Gedaan ✓" : !canCare ? "🔒 " + a.label : a.id === "eten" ? "Sleep naar diertje" : a.id === "spelen" ? "Gooi balletje" : "Houd diertje vast"}</p>
            </button>
          );
        })}
      </div>

      <AlertDialog open={lockedOpen} onOpenChange={setLockedOpen}>
        <AlertDialogContent className="rounded-3xl text-center">
          <AlertDialogHeader>
            <p className="text-5xl">📝</p>
            <AlertDialogTitle className="text-center">Eerst een taakje!</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Zet eerst minstens één taak op je to-do lijstje van vandaag. Daarna kun je {active.name} eten geven, ermee spelen en knuffelen. 💕
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="w-full rounded-full" onClick={() => { setLockedOpen(false); setTodoOpen(true); }}>Lijstje invullen</Button>
            <AlertDialogCancel className="mt-0 w-full rounded-full">Later</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {drag && <span className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 text-5xl" style={{ left: drag.x, top: drag.y }}>🍓</span>}
      {/* One panel at a time instead of everything under each other. */}
      <div className="grid grid-cols-4 gap-1 rounded-full bg-card p-1 shadow-soft">
        {PANELS.map((t) => (
          <button
            key={t.id}
            onClick={() => setPanel(t.id)}
            className={`rounded-full px-1 py-2 text-[12px] font-semibold ${panel === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {panel === "taken" && (
      <div className="rounded-3xl bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">To-do lijstje van {active.name} ✅</p>
            <p className="text-xs text-muted-foreground">
              {todayTasks === 0
                ? "Nog niets ingevuld vandaag."
                : `${doneTodos} van de ${todayTasks} taken afgevinkt · elke vink +5 XP`}
            </p>
          </div>
          <button onClick={() => setTodoOpen(true)}
            className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Open lijstje
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Elke ochtend om 7:00 begint een nieuw lijstje en komt het popupje vanzelf tevoorschijn. Taken van gisteren die niet af zijn, zijn gewoon weg — zonder straf.</p>
      </div>
      )}
      {panel === "aankleden" && <Wardrobe level={level} pet={{ ...pet, outfit: active.outfit }} onChoose={choose} />}
      {panel === "spelletjes" && (
        <div className="rounded-3xl bg-card p-5 shadow-soft">
          <p className="font-semibold">Spelletjes</p>
          <p className="mb-3 text-xs text-muted-foreground">Speel samen met {active.name}.</p>
          <PetGames uid={uid} petEmoji={speciesEmoji(active.species)} level={level} />
        </div>
      )}
      {panel === "kalender" && (
      <div className="rounded-3xl bg-card p-5 shadow-soft">
        <p className="font-semibold">{now.toLocaleDateString("nl-NL", { month: "long", year: "numeric" })}</p>
        <p className="text-xs text-muted-foreground">Een dag overslaan is helemaal oké — je diertje wacht gewoon op je.</p>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs">
          {["ma", "di", "wo", "do", "vr", "za", "zo"].map((d) => <span key={d} className="text-muted-foreground">{d}</span>)}
          {Array.from({ length: offset }).map((_, i) => <span key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = localDate(new Date(now.getFullYear(), now.getMonth(), i + 1));
            const hit = careDays.has(d);
            return (
              <span key={d} className={`rounded-full py-1 ${hit ? "bg-accent font-semibold" : ""} ${d === today ? "ring-1 ring-primary" : ""}`}>
                {hit ? "🐾" : i + 1}
              </span>
            );
          })}
        </div>
        <p className="mt-3 text-sm">{careDays.size} {careDays.size === 1 ? "dag" : "dagen"} verzorgd deze maand</p>
      </div>
      )}

      <DailyTodoPopup
        open={todoOpen}
        petName={active.name}
        day={today}
        canCare={canCare}
        petLists={petLists}
        currentList={currentList}
        listTodos={listTodos}
        todayTaskCount={todayTasks}
        doneTaskCount={doneTodos}
        onClose={() => setTodoOpen(false)}
        onSelectList={setListId}
        onAddList={addList}
        onRemoveList={removeList}
        onAddTodo={addTodo}
        onToggleTodo={toggleTodo}
        onRemoveTodo={removeTodo}
      />
    </div>
  );
}

const PANELS = [
  { id: "taken", label: "✅ Taken" },
  { id: "aankleden", label: "👕 Kleding" },
  { id: "spelletjes", label: "🎮 Spellen" },
  { id: "kalender", label: "📅 Kalender" },
] as const;
type PanelId = (typeof PANELS)[number]["id"];

function Adopt({ uid, onDone, companion = false }: { uid: string; onDone: () => void; companion?: boolean }) {
  const [species, setSpecies] = useState<string>("kat");
  const [name, setName] = useState("");
  async function save() {
    const { error } = companion
      ? await supabase.from("companions").insert({ user_id: uid, species, name: name.trim() })
      : await supabase.from("pets").insert({ user_id: uid, species, name: name.trim() });
    if (error) toast.error("Dat lukte niet."); else onDone();
  }
  return (
    <div className={companion ? "space-y-4" : "space-y-5 pt-2"}>
      <h1 className="text-3xl">{companion ? "Kies een nieuw diertje" : "Kies je diertje"}</h1>
      <div className="rounded-3xl bg-warm p-4"><PetAvatar species={species} mood="blij" jumping={false} onTap={() => {}} /></div>
      <div className="grid grid-cols-3 gap-2">
        {PET_SPECIES.map((s) => (
          <button key={s.id} onClick={() => setSpecies(s.id)}
            className={`rounded-3xl p-3 text-center ${species === s.id ? "bg-accent ring-2 ring-primary" : "bg-card shadow-soft"}`}>
            <p className="text-3xl">{s.emoji}</p><p className="text-xs">{s.label}</p>
          </button>
        ))}
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="Geef je diertje een naam"
        className="w-full rounded-2xl border border-input bg-card px-4 py-3" />
      <button disabled={!name.trim()} onClick={save} className="w-full rounded-2xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50">
        Adopteer {name.trim() || "je diertje"}
      </button>
    </div>
  );
}

function useLevelUpToast(level: number | null) {
  useEffect(() => {
    if (level == null) return;
    const key = "cerita-pet-level";
    const prev = Number(localStorage.getItem(key) ?? level);
    localStorage.setItem(key, String(level));
    if (level > prev) {
      const extra = level >= 3 && level % 2 === 1 ? ["🐾 een nieuw diertje"] : [];
      const grew = growthStage(level) > growthStage(prev);
      if (grew) extra.unshift(`🌱 je diertje is gegroeid: nu een ${STAGE_LABELS[growthStage(level)]!.toLowerCase()}`);
      const items = [...extra, ...unlocksAt(level).map((i) => `${i.emoji} ${i.label}`)].join(", ");
      toast.success(`Level ${level}! 🎉`, { description: items ? `Nieuw voor je diertje: ${items}` : "Goed bezig!" });
    }
  }, [level]);
}

function Wardrobe({ level, pet, onChoose }: {
  level: number;
  pet: { background: string; outfit: string };
  onChoose: (field: "background" | "outfit", id: string) => void;
}) {
  const [tab, setTab] = useState<"background" | "outfit">("outfit");
  const lists: Record<"background" | "outfit", Unlockable[]> = { background: BACKGROUNDS, outfit: OUTFITS };
  const tabs = [["outfit", "👕 Kleding"], ["background", "🖼️ Achtergrond"]] as const;
  return (
    <div className="rounded-3xl bg-card p-5 shadow-soft">
      <p className="font-semibold">Aankleden</p>
      <p className="text-xs text-muted-foreground">Bij elk nieuw level komen er dingetjes bij.</p>
      <div className="mt-3 flex gap-2">
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`rounded-full px-3 py-1 text-xs font-semibold ${tab === id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{label}</button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {lists[tab].map((item) => {
          const open = isUnlocked(item, level);
          const active = pet[tab] === item.id;
          return (
            <button key={item.id} disabled={!open} onClick={() => onChoose(tab, item.id)}
              className={`rounded-2xl p-3 text-center ${active ? "bg-accent ring-2 ring-primary" : "bg-muted"} ${open ? "" : "opacity-50"}`}>
              <p className="text-2xl">{open ? item.emoji : "🔒"}</p>
              <p className="text-xs">{open ? item.label : `Level ${item.level}`}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
