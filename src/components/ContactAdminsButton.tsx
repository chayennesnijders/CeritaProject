import { Link } from "@tanstack/react-router";
import { unseenReplies } from "@/lib/admin-messages";
import { useMyAdminMessages } from "@/lib/use-admin-messages";

/** Clear way for members to write to the admins; shows when an answer is waiting. */
export function ContactAdminsButton({ uid }: { uid: string | undefined }) {
  const { data: mine = [] } = useMyAdminMessages(uid);
  const answers = unseenReplies(mine);
  return (
    <Link
      to="/contact"
      className="flex items-center gap-3 rounded-3xl border-2 border-primary bg-card p-4 shadow-soft transition active:scale-[0.98]"
    >
      <span className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-2xl">
        💌
        {answers > 0 && (
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border-2 border-card bg-accent text-[10px] font-bold text-accent-foreground">
            {answers}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">Bericht aan de beheerders</span>
        <span className="block text-xs text-muted-foreground">
          {answers > 0
            ? `Je hebt ${answers === 1 ? "een nieuw antwoord" : `${answers} nieuwe antwoorden`}! 🎉`
            : "Een vraag, idee of iets kwijt? Wij lezen het."}
        </span>
      </span>
      <span className="text-primary">→</span>
    </Link>
  );
}
