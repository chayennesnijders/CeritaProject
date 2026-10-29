import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nieuw wachtwoord — CeritaProject" },
      { name: "description", content: "Kies een nieuw wachtwoord voor je CeritaProject-account." },
      { property: "og:title", content: "Nieuw wachtwoord — CeritaProject" },
      { property: "og:description", content: "Kies een nieuw wachtwoord voor je CeritaProject-account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) { toast.error("De wachtwoorden zijn niet hetzelfde"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error("Dat lukte niet. Vraag opnieuw een link aan."); return; }
    toast.success("Je nieuwe wachtwoord is opgeslagen");
    nav({ to: "/home" });
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-6 py-10">
      <p className="font-display text-2xl font-bold text-primary">Cerita</p>
      <h1 className="mt-8 text-4xl text-foreground">Nieuw wachtwoord</h1>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div><Label htmlFor="p1">Nieuw wachtwoord</Label><Input id="p1" type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1 h-12 rounded-2xl" /></div>
        <div><Label htmlFor="p2">Nog een keer</Label><Input id="p2" type="password" minLength={8} required value={pw2} onChange={(e) => setPw2(e.target.value)} className="mt-1 h-12 rounded-2xl" /></div>
        <Button disabled={busy} className="h-12 w-full rounded-full">Opslaan</Button>
      </form>
    </div>
  );
}
