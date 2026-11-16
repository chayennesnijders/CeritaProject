import { createFileRoute } from "@tanstack/react-router";
import { Riti } from "@/components/Riti";
import { QrCode } from "@/components/QrCode";
import { flyerLink, isAmbassadorCode } from "@/lib/ambassador";

/**
 * A printable A4 flyer with a QR code to the waitlist. Public (no login) so it prints cleanly and can be
 * shared: ?code=<ambassador code> puts that ambassador's own link in the QR code, without it the team's link.
 */
export const Route = createFileRoute("/flyer")({
  validateSearch: (s: Record<string, unknown>): { code?: string } =>
    typeof s["code"] === "string" && isAmbassadorCode(s["code"]) ? { code: s["code"] } : {},
  head: () => ({ meta: [{ title: "Flyer — CeritaProject" }, { name: "robots", content: "noindex" }] }),
  component: FlyerPage,
});

const PERKS = [
  ["💬", "Praat met leeftijdsgenoten die het snappen"],
  ["📔", "Schrijf in je eigen, privé dagboek"],
  ["📖", "Lees echte verhalen van jongeren"],
] as const;

function FlyerPage() {
  const { code } = Route.useSearch();
  const link = flyerLink(code);
  return (
    <div className="min-h-screen bg-[#F7EDE1] py-6 print:bg-white print:py-0">
      <style>{`@page { size: A4; margin: 0; } @media print { html, body { background: #F7EDE1 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-center gap-2 px-4 print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded-full bg-[#1E1615] px-5 py-2.5 text-sm font-semibold text-[#F2A6BF]"
        >
          🖨️ Printen of opslaan als PDF
        </button>
        <p className="w-full text-center text-xs text-[#6B4A35]">
          Tip: kies bij printen ‘Achtergrond afdrukken’ voor de kleuren. A4 of A5 kan allebei.
        </p>
      </div>

      <article className="mx-auto flex aspect-[210/297] w-full max-w-[210mm] flex-col bg-[#F7EDE1] p-[7%] text-[#1E1615] print:max-w-none">
        <p className="font-display text-[clamp(14px,2.6vw,22px)] font-bold tracking-tight">
          Cerita<span className="text-[#E58AA9]">Project</span>
        </p>

        <div className="mt-[4%] rounded-[28px] border-4 border-[#1E1615] bg-[#FDF8F2] p-[6%] shadow-[10px_10px_0_#1E1615]">
          <div className="flex items-start gap-4">
            <h1 className="flex-1 font-display text-[clamp(26px,6.4vw,56px)] leading-[1.05]">
              Er komt een app aan <span className="text-[#E58AA9]">💗</span>
            </h1>
            <Riti size={110} expression="blij" wave className="shrink-0" />
          </div>
          <p className="mt-3 text-[clamp(14px,2.5vw,22px)] font-semibold">
            Een veilige plek voor jongeren van 13 tot 27. Je bent niet de enige.
          </p>
          <ul className="mt-[5%] space-y-2.5">
            {PERKS.map(([emoji, text]) => (
              <li key={text} className="flex items-center gap-3 text-[clamp(13px,2.3vw,20px)]">
                <span className="flex size-[2.2em] shrink-0 items-center justify-center rounded-full border-2 border-[#1E1615] bg-[#F2A6BF]">
                  {emoji}
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto mt-[7%] w-[86%] -rotate-1 rounded-[22px] border-4 border-[#1E1615] bg-[#F2A6BF] px-[6%] py-[4%] text-center shadow-[8px_8px_0_#1E1615]">
          <p className="font-hand text-[clamp(22px,4.6vw,40px)] leading-tight">
            Voor als je even niemand hebt die het snapt. Hier wel.
          </p>
        </div>

        <div className="mt-auto flex items-center gap-[6%] pt-[6%]">
          <div className="w-[38%] shrink-0 rounded-[22px] border-4 border-[#1E1615] bg-white p-2 shadow-[8px_8px_0_#1E1615]">
            <QrCode text={link} className="block h-auto w-full" />
          </div>
          <div className="flex-1">
            <p className="font-display text-[clamp(18px,4vw,36px)] leading-tight">Scan mij en zet je op de wachtlijst</p>
            <p className="mt-2 text-[clamp(12px,2vw,17px)] text-[#6B4A35]">
              Gratis. Je hoort het als eerste als de app er is. Jonger dan 16? Dan doe je het samen met je ouder of verzorger.
            </p>
          </div>
        </div>

        <p className="mt-[5%] border-t-2 border-dashed border-[#1E1615]/30 pt-3 text-center text-[clamp(10px,1.6vw,13px)] text-[#6B4A35]">
          Zit je nu ergens mee? Kindertelefoon 0800-0432 (tot 18) · 113 (0800-0113) · bij gevaar 112
        </p>
      </article>
    </div>
  );
}
