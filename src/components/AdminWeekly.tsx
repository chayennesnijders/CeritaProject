import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { bandLabel } from "@/lib/auth";
import { euro, settlement } from "@/lib/shop";

/** Weekoverzicht voor de beheerder: prestaties van de afgelopen 7 dagen + nieuwste leden. */
export function AdminWeekly() {
  const { data } = useQuery({
    queryKey: ["admin-weekly"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [members, orders, articles, subs] = await Promise.all([
        supabase.from("profiles").select("id, display_name, age_group, created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("shop_orders").select("*").neq("kind", "gift").gte("created_at", since),
        supabase.from("articles").select("id", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("story_submissions").select("id", { count: "exact", head: true }).gte("created_at", since),
      ]);
      const weekOrders = orders.data ?? [];
      const tot = weekOrders.reduce(
        (a, o) => {
          const x = settlement(o);
          return { paid: a.paid + x.paid, profit: a.profit + x.profit, points: a.points + o.points };
        },
        { paid: 0, profit: 0, points: 0 },
      );
      const newMembers = (members.data ?? []).filter((m) => m.created_at >= since);
      return {
        members: members.data ?? [],
        newMembers: newMembers.length,
        orders: weekOrders.length,
        paid: tot.paid,
        profit: tot.profit,
        points: tot.points,
        articles: articles.count ?? 0,
        submissions: subs.count ?? 0,
      };
    },
  });

  if (!data) return null;

  return (
    <section className="space-y-3 rounded-3xl bg-card p-5 shadow-soft">
      <h2 className="text-lg">Jouw week 💪</h2>
      <p className="text-xs text-muted-foreground">Wat er de afgelopen 7 dagen is gebeurd. Even stilstaan bij wat je hebt bereikt.</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-2xl bg-muted p-3"><span className="block text-2xl font-bold text-primary">{data.newMembers}</span>nieuwe leden</div>
        <div className="rounded-2xl bg-muted p-3"><span className="block text-2xl font-bold text-primary">{data.orders}</span>bestellingen</div>
        <div className="rounded-2xl bg-muted p-3"><span className="block text-2xl font-bold text-primary">{euro(data.paid)}</span>ontvangen</div>
        <div className="rounded-2xl bg-muted p-3"><span className="block text-2xl font-bold text-primary">{euro(data.profit)}</span>winst</div>
        <div className="rounded-2xl bg-muted p-3"><span className="block text-2xl font-bold text-primary">{data.articles}</span>verhalen geplaatst</div>
        <div className="rounded-2xl bg-muted p-3"><span className="block text-2xl font-bold text-primary">{data.submissions}</span>ingestuurde verhalen</div>
      </div>

      <h3 className="pt-2 text-sm font-semibold">Nieuwste leden</h3>
      <div className="space-y-2">
        {data.members.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-2xl bg-muted p-3 text-sm">
            <span className="font-semibold">{m.display_name}</span>
            <span className="text-xs text-muted-foreground">
              {bandLabel(m.age_group)} · {new Date(m.created_at).toLocaleDateString("nl-NL")}
            </span>
          </div>
        ))}
        {data.members.length === 0 && <p className="text-sm text-muted-foreground">Nog geen leden.</p>}
      </div>
    </section>
  );
}
