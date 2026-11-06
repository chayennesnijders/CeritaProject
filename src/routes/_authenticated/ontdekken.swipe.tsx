import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronUp, X } from "lucide-react";
import { ReadAloud } from "@/components/ReadAloud";
import { categoryEmoji, categoryLabel, photoInParagraph, useArticleImage } from "@/lib/articles";
import { useMe } from "@/lib/auth";
import { NO_REACTIONS, ofKind, REACTIONS, readingMinutes } from "@/lib/discover";
import { feedSlides, isDoubleTap, SENSITIVE_CATEGORIES, storyHook, swipeOrder } from "@/lib/swipe-feed";
import { useDiscover, useStoryActions } from "@/lib/use-discover";

export const Route = createFileRoute("/_authenticated/ontdekken/swipe")({
  head: () => ({ meta: [{ title: "Swipen door verhalen — CeritaProject" }] }),
  validateSearch: (s: Record<string, unknown>): { start?: string } =>
    typeof s["start"] === "string" ? { start: s["start"] } : {},
  component: SwipePage,
});

type Story = ReturnType<typeof useDiscover>["stories"][number];

// Soft colour backgrounds for stories without a photo.
const BACKDROPS = [
  "from-[#f7a8c4] to-[#7a3b69]",
  "from-[#a8d8f7] to-[#2f4f7a]",
  "from-[#f7d9a8] to-[#8a4b2a]",
  "from-[#b8f0c8] to-[#2f6a4a]",
  "from-[#d4c2f7] to-[#4a3a7a]",
];

function SwipePage() {
  const { start } = Route.useSearch();
  const nav = useNavigate();
  const { data: me } = useMe();
  const uid = me?.user.id;
  const { stories: all, isLoading, mineLoaded, counts, saved, read, reacted } = useDiscover(uid);
  const actions = useStoryActions(uid);

  // The order is fixed once when the feed opens, so marking a story as read never reshuffles it.
  const [order, setOrder] = useState<Story[] | null>(null);
  useEffect(() => {
    if (order || isLoading || !mineLoaded || !uid) return;
    setOrder(swipeOrder(ofKind(all, "verhaal"), read, start));
  }, [order, isLoading, mineLoaded, uid, all, read, start]);
  const slides = useMemo(() => feedSlides(order ?? []), [order]);

  const [current, setCurrent] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // Track which slide fills the screen (for loading photos near it and the counter).
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) setCurrent(Number((e.target as HTMLElement).dataset["index"]));
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll("[data-index]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [slides]);

  // No page scrolling behind the feed.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const close = () => nav({ to: "/ontdekken" });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // Escape that closes another pop-up (e.g. the weekly rules) must not close the feed too.
      if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) return;
      if (openId) setOpenId(null);
      else void nav({ to: "/ontdekken" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId, nav]);

  const open = (s: Story) => {
    setOpenId(s.id);
    actions.markRead(s.id);
  };
  const storyCount = order?.length ?? 0;
  const currentSlide = slides[current];
  const opened = order?.find((s) => s.id === openId) ?? null;

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-40 bg-black text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 pb-6 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <span className="text-sm font-semibold">📖 Verhalen</span>
        <span className="text-xs opacity-80">
          {currentSlide?.type === "story" ? `${currentSlide.n + 1} / ${storyCount}` : ""}
        </span>
        <button
          onClick={close}
          aria-label="Sluiten"
          className="pointer-events-auto grid size-10 place-items-center rounded-full bg-black/50"
        >
          <X className="size-5" />
        </button>
      </div>

      {!order ? (
        <p className="grid h-full place-items-center text-sm opacity-80">Verhalen laden…</p>
      ) : storyCount === 0 ? (
        <div className="grid h-full place-items-center p-8 text-center">
          <div className="space-y-3">
            <p className="text-4xl">📖</p>
            <p>Er staan nog geen verhalen klaar.</p>
            <Link to="/verhaal-insturen" className="inline-block rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
              Deel jouw verhaal
            </Link>
          </div>
        </div>
      ) : (
        <div ref={scroller} className="h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain [scrollbar-width:none]">
          {slides.map((slide, i) => (
            <section
              key={slide.type === "story" ? slide.story.id : `${slide.type}-${i}`}
              data-index={i}
              className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden"
            >
              {slide.type === "story" ? (
                <StorySlide
                  story={slide.story}
                  near={Math.abs(i - current) <= 2}
                  backdrop={BACKDROPS[slide.n % BACKDROPS.length]!}
                  counts={counts.get(slide.story.id) ?? NO_REACTIONS}
                  reacted={reacted}
                  isSaved={saved.has(slide.story.id)}
                  wasRead={read.has(slide.story.id)}
                  onReact={(kind, on) => actions.toggleReaction(slide.story.id, kind, on)}
                  onSave={() => actions.toggleSave(slide.story.id, saved.has(slide.story.id))}
                  onOpen={() => open(slide.story)}
                />
              ) : slide.type === "pauze" ? (
                <PauseSlide seen={slide.seen} />
              ) : (
                <EndSlide onRestart={() => scroller.current?.scrollTo({ top: 0, behavior: "smooth" })} />
              )}
            </section>
          ))}
        </div>
      )}

      {opened && (
        <FullStory
          story={opened}
          counts={counts.get(opened.id) ?? NO_REACTIONS}
          reacted={reacted}
          onReact={(kind, on) => actions.toggleReaction(opened.id, kind, on)}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>,
    document.body,
  );
}

type ReactionKind = (typeof REACTIONS)[number]["kind"];

function StorySlide({
  story,
  near,
  backdrop,
  counts,
  reacted,
  isSaved,
  wasRead,
  onReact,
  onSave,
  onOpen,
}: {
  story: Story;
  near: boolean;
  backdrop: string;
  counts: Record<ReactionKind, number>;
  reacted: Set<string>;
  isSaved: boolean;
  wasRead: boolean;
  onReact: (kind: ReactionKind, on: boolean) => void;
  onSave: () => void;
  onOpen: () => void;
}) {
  // Photos load only for the cards around the one on screen.
  const { data: img } = useArticleImage(near ? story.image_url : null);
  const hook = useMemo(() => storyHook(story.body), [story.body]);
  const lastTap = useRef(0);
  const [burst, setBurst] = useState(0);
  const hearted = reacted.has(`${story.id}:herkenbaar`);

  // Double tap anywhere on the card = 💛 Herkenbaar (like TikTok's heart), never takes it away.
  const tap = () => {
    const now = Date.now();
    if (isDoubleTap(lastTap.current, now)) {
      if (!hearted) onReact("herkenbaar", false);
      setBurst((b) => b + 1);
      lastTap.current = 0;
    } else lastTap.current = now;
  };

  return (
    <div className="absolute inset-0" onClick={tap}>
      {img ? (
        <img src={img} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className={`absolute inset-0 grid place-items-center bg-gradient-to-br ${backdrop}`}>
          <span className="text-[7rem] opacity-90">{story.emoji}</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.85)_0%,rgba(0,0,0,0.45)_35%,rgba(0,0,0,0)_60%,rgba(0,0,0,0.25)_100%)]" />

      {burst > 0 && (
        <span key={burst} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-[ping_0.7s_ease-out_1] text-8xl">
          💛
        </span>
      )}

      <div className="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] right-3 z-10 flex flex-col items-center gap-4">
        {REACTIONS.map((r) => {
          const on = reacted.has(`${story.id}:${r.kind}`);
          return (
            <button
              key={r.kind}
              onClick={(e) => {
                e.stopPropagation();
                onReact(r.kind, on);
              }}
              aria-pressed={on}
              aria-label={r.label}
              className="flex flex-col items-center"
            >
              <span className={`grid size-12 place-items-center rounded-full text-2xl transition active:scale-90 ${on ? "bg-white/90" : "bg-black/45"}`}>
                {r.emoji}
              </span>
              <span className="mt-0.5 text-[11px] font-semibold [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]">{counts[r.kind]}</span>
            </button>
          );
        })}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          aria-pressed={isSaved}
          aria-label={isSaved ? "Niet meer bewaren" : "Bewaren"}
          className="flex flex-col items-center"
        >
          <span className={`grid size-12 place-items-center rounded-full text-2xl ${isSaved ? "bg-white/90" : "bg-black/45"}`}>
            {isSaved ? "⭐" : "☆"}
          </span>
          <span className="mt-0.5 text-[11px] font-semibold [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]">Bewaar</span>
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-[5] space-y-2 p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pr-20">
        <p className="flex flex-wrap gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
          <span className="rounded-full bg-black/45 px-2 py-0.5">
            {categoryEmoji(story.category)} {categoryLabel(story.category)}
          </span>
          <span className="rounded-full bg-black/45 px-2 py-0.5">⏱️ {readingMinutes(story.body)} min</span>
          {wasRead && <span className="rounded-full bg-black/45 px-2 py-0.5">✓ Gelezen</span>}
        </p>
        <h2 className="text-2xl font-bold leading-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]">{story.title}</h2>
        <p className="line-clamp-5 text-[15px] leading-relaxed opacity-95 [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]">{hook}</p>
        {SENSITIVE_CATEGORIES.has(story.category) && (
          <p className="text-xs opacity-80">💛 Kan over moeilijke dingen gaan. Stop wanneer je wilt.</p>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="mt-1 flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black active:scale-95"
        >
          <ChevronUp className="size-4" /> Lees het hele verhaal
        </button>
      </div>
    </div>
  );
}

function PauseSlide({ seen }: { seen: number }) {
  return (
    <div className="grid h-full place-items-center bg-gradient-to-b from-[#2f6a4a] to-[#123322] p-8 text-center">
      <div className="max-w-xs space-y-4">
        <p className="text-6xl">🌿</p>
        <h2 className="text-2xl font-bold">Even een adempauze?</h2>
        <p className="text-sm opacity-90">
          Je hebt al {seen} verhalen gezien. Sommige verhalen raken je meer dan je denkt. Hoe gaat het nu met jou?
        </p>
        <div className="flex flex-col gap-2">
          <Link to="/rust" className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black">
            🫧 Rustmoment van 1 minuut
          </Link>
          <Link to="/stemming" className="rounded-full bg-white/20 px-4 py-2.5 text-sm font-semibold">
            Hoe voel ik me?
          </Link>
        </div>
        <p className="flex items-center justify-center gap-1 text-xs opacity-70">
          <ChevronUp className="size-4" /> Of swipe verder
        </p>
      </div>
    </div>
  );
}

function EndSlide({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="grid h-full place-items-center bg-gradient-to-b from-[#7a3b69] to-[#2a1026] p-8 text-center">
      <div className="max-w-xs space-y-4">
        <p className="text-6xl">🎉</p>
        <h2 className="text-2xl font-bold">Je hebt alle verhalen gezien</h2>
        <p className="text-sm opacity-90">Elk verhaal is van een echte jongere. Misschien helpt het jouwe straks iemand anders.</p>
        <div className="flex flex-col gap-2">
          <Link to="/verhaal-insturen" className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black">
            ✍️ Deel jouw verhaal
          </Link>
          <button onClick={onRestart} className="rounded-full bg-white/20 px-4 py-2.5 text-sm font-semibold">
            Opnieuw beginnen
          </button>
          <Link to="/ontdekken" className="text-sm underline opacity-80">
            Terug naar Ontdekken
          </Link>
        </div>
      </div>
    </div>
  );
}

function FullStory({
  story,
  counts,
  reacted,
  onReact,
  onClose,
}: {
  story: Story;
  counts: Record<ReactionKind, number>;
  reacted: Set<string>;
  onReact: (kind: ReactionKind, on: boolean) => void;
  onClose: () => void;
}) {
  const paragraphs = story.body.split("\n\n").filter((p) => p.trim() && !photoInParagraph(p));
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-label={story.title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88dvh] overflow-y-auto overscroll-contain rounded-t-3xl bg-background p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] text-foreground"
      >
        <div className="sticky -top-5 -mx-5 -mt-5 mb-2 flex items-center justify-between bg-background px-5 pb-2 pt-3">
          <span className="mx-auto h-1.5 w-12 rounded-full bg-muted" aria-hidden />
        </div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-2xl leading-tight">{story.title}</h2>
          <button onClick={onClose} aria-label="Terug naar het swipen" className="grid size-9 shrink-0 place-items-center rounded-full bg-muted">
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-2">
          <ReadAloud text={`${story.title}. ${paragraphs.join(" ")}`} />
        </div>
        {SENSITIVE_CATEGORIES.has(story.category) && (
          <p className="mt-3 rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">
            💛 Dit verhaal kan over moeilijke dingen gaan. Raakt het je? Praat erover met iemand die je vertrouwt, of bel gratis de
            Kindertelefoon (0800-0432) of 113 (0800-0113).
          </p>
        )}
        <div className="mt-4 space-y-4 text-[15px] leading-relaxed">
          {paragraphs.map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
        <p className="mt-6 text-center text-sm font-semibold">Hoe raakt dit verhaal je?</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {REACTIONS.map((r) => {
            const on = reacted.has(`${story.id}:${r.kind}`);
            return (
              <button
                key={r.kind}
                onClick={() => onReact(r.kind, on)}
                aria-pressed={on}
                className={`flex flex-col items-center rounded-2xl px-2 py-3 transition active:scale-90 ${on ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                <span className="text-2xl">{r.emoji}</span>
                <span className="mt-1 text-xs font-semibold">{r.label}</span>
                <span className="text-xs opacity-80">{counts[r.kind]}</span>
              </button>
            );
          })}
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
          Verder swipen ↓
        </button>
      </div>
    </div>
  );
}
