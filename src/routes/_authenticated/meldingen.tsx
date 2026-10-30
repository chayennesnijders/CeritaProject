import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Riti } from "@/components/Riti";
import { useInbox } from "@/lib/use-inbox";

export const Route = createFileRoute("/_authenticated/meldingen")({
  head: () => ({
    meta: [
      { title: "Meldingen — CeritaProject" },
      { name: "description", content: "Alles wat nieuw is voor jou op één plek." },
    ],
  }),
  component: InboxPage,
});

/** Everything new for you in one list: messages, your turn, compliments, answers, letters and meetups. */
function InboxPage() {
  const { items } = useInbox();
  // Some links carry a ?spel=… part, so navigate by full address.
  const navigate = useNavigate();
  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-3xl">🔔 Meldingen</h1>
      {items.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-card p-6 text-center shadow-soft">
          <Riti size={120} expression="blij" />
          <p className="mt-2 font-semibold">Je bent helemaal bij!</p>
          <p className="text-sm text-muted-foreground">
            Nieuwe berichten, complimenten en herinneringen zie je hier.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <button
              key={i.id}
              onClick={() => navigate({ href: i.to })}
              className="flex w-full items-center text-left gap-3 rounded-3xl bg-card p-4 shadow-soft active:scale-[0.99]"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-2xl">
                {i.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{i.title}</span>
                {i.detail && !i.detail.startsWith("/") && (
                  <span className="block truncate text-xs text-muted-foreground">{i.detail}</span>
                )}
              </span>
              <span className="text-primary">→</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
