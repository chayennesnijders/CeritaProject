import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bandLabel } from "@/lib/auth";
import { useSignedImage } from "@/lib/articles";
import { challengeDay } from "@/lib/challenges";
import { monthOf } from "@/lib/goals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function AdminImage({ path }: { path: string }) {
  const { data: src } = useSignedImage("theme-entries", path);
  return src ? (
    <img src={src} alt="" className="max-h-64 w-full rounded-2xl object-contain" />
  ) : null;
}

/** Beheer → Thema: set the theme of a month and choose the best entries. */
export function ThemeAdmin() {
  const qc = useQueryClient();
  const current = monthOf(challengeDay());
  const [f, setF] = useState({
    month: current.slice(0, 7),
    title: "",
    emoji: "✨",
    description: "",
  });
  const [show, setShow] = useState<"nieuw" | "gekozen" | "afgewezen">("nieuw");
  const { data } = useQuery({
    queryKey: ["admin-themes"],
    queryFn: async () => {
      const [t, e] = await Promise.all([
        supabase.from("themes").select("*").order("month", { ascending: false }).limit(12),
        supabase
          .from("theme_entries")
          .select(
            "id, theme_id, kind, body, image_path, status, show_name, age_group, created_at, maker:profiles(display_name)",
          )
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      return { themes: t.data ?? [], entries: e.data ?? [] };
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-themes"] });
    qc.invalidateQueries({ queryKey: ["theme-month"] });
  };

  async function save() {
    const { error } = await supabase.from("themes").upsert(
      {
        month: `${f.month}-01`,
        title: f.title.trim(),
        emoji: f.emoji || "✨",
        description: f.description.trim() || null,
      },
      { onConflict: "month" },
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Thema opgeslagen ✨");
    refresh();
  }
  async function setStatus(id: string, status: "gekozen" | "afgewezen" | "nieuw") {
    const { error } = await supabase.from("theme_entries").update({ status }).eq("id", id);
    toast[error ? "error" : "success"](
      error ? error.message : status === "gekozen" ? "Gekozen 🌟" : "Bijgewerkt",
    );
    refresh();
  }
  const themeName = (id: string) => data?.themes.find((t) => t.id === id)?.title ?? "Thema";
  const list = (data?.entries ?? []).filter((e) => e.status === show);

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
        <h2 className="text-lg">✨ Thema instellen</h2>
        <Input
          type="month"
          value={f.month}
          onChange={(e) => setF({ ...f, month: e.target.value })}
          className="h-12 w-full rounded-2xl"
        />
        <div className="flex gap-2">
          <Input
            value={f.emoji}
            maxLength={8}
            onChange={(e) => setF({ ...f, emoji: e.target.value })}
            className="w-16 rounded-2xl text-center"
          />
          <Input
            value={f.title}
            maxLength={60}
            onChange={(e) => setF({ ...f, title: e.target.value })}
            placeholder="Bijvoorbeeld: Vriendschap"
            className="rounded-2xl"
          />
        </div>
        <Textarea
          value={f.description}
          maxLength={500}
          onChange={(e) => setF({ ...f, description: e.target.value })}
          placeholder="Wat mogen leden insturen? Bijvoorbeeld: Wie is jouw beste vriend(in) en waarom?"
          className="rounded-2xl"
        />
        <Button
          disabled={f.title.trim().length < 2 || !f.month}
          className="w-full rounded-full"
          onClick={save}
        >
          Opslaan
        </Button>
        <div className="space-y-1 pt-1 text-sm">
          {data?.themes.map((t) => (
            <button
              key={t.id}
              onClick={() =>
                setF({
                  month: t.month.slice(0, 7),
                  title: t.title,
                  emoji: t.emoji,
                  description: t.description ?? "",
                })
              }
              className="block w-full rounded-xl bg-muted px-3 py-2 text-left"
            >
              {t.month.slice(0, 7)} · {t.emoji} {t.title}{" "}
              {t.month === current && <span className="text-xs text-primary">(nu)</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
          {(["nieuw", "gekozen", "afgewezen"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setShow(s)}
              className={`rounded-full py-2 text-xs font-semibold ${show === s ? "bg-card shadow-soft" : ""}`}
            >
              {s === "nieuw"
                ? `Nieuw (${(data?.entries ?? []).filter((e) => e.status === "nieuw").length})`
                : s === "gekozen"
                  ? "Gekozen"
                  : "Niet gekozen"}
            </button>
          ))}
        </div>
        {list.length === 0 && <p className="text-sm text-muted-foreground">Niets hier.</p>}
        {list.map((e) => (
          <article key={e.id} className="space-y-2 rounded-3xl bg-card p-4 shadow-soft">
            <p className="text-xs text-muted-foreground">
              {themeName(e.theme_id)} ·{" "}
              {(e.maker as { display_name?: string } | null)?.display_name ?? "Lid"} ·{" "}
              {bandLabel(e.age_group)}
              {e.show_name ? " · naam mag erbij" : " · anoniem"}
            </p>
            {e.image_path && <AdminImage path={e.image_path} />}
            {e.body && <p className="whitespace-pre-wrap text-sm">{e.body}</p>}
            <div className="flex gap-2">
              {e.status !== "afgewezen" && (
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={() => setStatus(e.id, "afgewezen")}
                >
                  Niet kiezen
                </Button>
              )}
              {e.status !== "gekozen" && (
                <Button className="flex-1 rounded-full" onClick={() => setStatus(e.id, "gekozen")}>
                  🌟 Kiezen
                </Button>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
