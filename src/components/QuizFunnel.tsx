"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CREATORS, type Creator } from "@/data/creators";
import CreatorCard from "./CreatorCard";
import Stage from "./Stage";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

type Step =
  | { kind: "intro" }
  | { kind: "swiping" }
  | { kind: "question"; index: number }
  | { kind: "matchedLoading" }
  | { kind: "results" };

const QUESTIONS: { title: string; subtitle?: string; options: string[] }[] = [
  {
    title: "Quick — what&apos;s your style?",
    subtitle: "Helps us pick the right one to connect you with.",
    options: ["Chill & cozy", "Outdoorsy & fitness", "Artsy & alt", "Glam & fashion"],
  },
  {
    title: "What kind of energy are you into?",
    options: [
      "Sweet & wholesome",
      "Funny & playful",
      "Bold & confident",
      "Calm & mysterious",
    ],
  },
  {
    title: "How often do you usually message?",
    options: ["All day", "Few times a day", "Once a day", "Now and then"],
  },
  {
    title: "Last thing — what do you like most?",
    options: ["Photos", "Short videos", "Stories", "Lives"],
  },
];

const MATCHED_STAGES = [
  { label: "Reviewing the people you liked…", duration: 900 },
  { label: "Finding your strongest match…", duration: 1100 },
  { label: "Opening her profile…", duration: 800 },
];

function firePixel(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
  if (!fbq || !PIXEL_ID) return;
  fbq("trackSingle", PIXEL_ID, event, params);
}

export default function QuizFunnel() {
  const [step, setStep] = useState<Step>({ kind: "intro" });
  const [likes, setLikes] = useState<string[]>([]);

  // Auto-advance from "Confirming your matches…" → redirect (or fallback results)
  useEffect(() => {
    if (step.kind !== "matchedLoading") return;

    // Fire conversion events early so they have time to flush before navigation
    const firstLiked = likes[0];
    if (firstLiked) {
      const creator = CREATORS.find((c) => c.slug === firstLiked);
      if (creator) {
        const payload = {
          content_name: creator.name,
          content_ids: [firstLiked],
          currency: "USD",
          value: 30,
        };
        firePixel("Subscribe", payload);
        firePixel("InitiateCheckout", payload);
      }
    }

    const total = MATCHED_STAGES.reduce((sum, s) => sum + s.duration, 0);
    const t = setTimeout(() => {
      if (firstLiked) {
        window.location.href = `/go?slug=${encodeURIComponent(firstLiked)}`;
      } else {
        // Defensive fallback — shouldn't reach here, but if no likes, show results.
        setStep({ kind: "results" });
      }
    }, total);
    return () => clearTimeout(t);
  }, [step.kind, likes]);

  function start() {
    firePixel("Lead", {
      content_name: "started_swiping",
      content_category: "creator_match",
    });
    setStep({ kind: "swiping" });
  }

  function onSwipeComplete(likedSlugs: string[]) {
    setLikes(likedSlugs);
    firePixel("Lead", {
      content_name: "swipe_complete",
      content_category: "creator_match",
      num_liked: likedSlugs.length,
    });
    if (likedSlugs.length > 0) {
      // They liked someone — run the quiz to confirm the match
      setStep({ kind: "question", index: 0 });
    } else {
      // Skipped everyone — show the grid so they can still pick one
      setStep({ kind: "results" });
    }
  }

  function answer() {
    if (step.kind !== "question") return;
    const next = step.index + 1;
    if (next < QUESTIONS.length) {
      setStep({ kind: "question", index: next });
    } else {
      firePixel("Lead", {
        content_name: "quiz_complete",
        content_category: "creator_match",
      });
      setStep({ kind: "matchedLoading" });
    }
  }

  return (
    <Stage>
      {step.kind === "intro" && <Intro onStart={start} />}
      {step.kind === "swiping" && <Swiping onComplete={onSwipeComplete} />}
      {step.kind === "question" && (
        <Question
          key={step.index}
          index={step.index}
          total={QUESTIONS.length}
          title={QUESTIONS[step.index].title}
          subtitle={QUESTIONS[step.index].subtitle}
          options={QUESTIONS[step.index].options}
          onSelect={answer}
        />
      )}
      {step.kind === "matchedLoading" && (
        <LoadingScreen
          stages={MATCHED_STAGES}
          finalLabel="Match request sent"
        />
      )}
      {step.kind === "results" && <Results likes={likes} />}
    </Stage>
  );
}

// ─────────────────────── shared elements ───────────────────────

function BrandHeader({ subtle = false }: { subtle?: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md ${
        subtle ? "" : "shadow-[0_4px_18px_rgba(0,0,0,0.25)]"
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
      <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/85">
        peach club
      </span>
    </div>
  );
}

// ─────────────────────── screens ───────────────────────

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12">
      <div className="max-w-md w-full text-center space-y-7 animate-[fadeIn_500ms_ease-out]">
        <div className="flex justify-center">
          <BrandHeader />
        </div>

        <div>
          <h1 className="text-[2.5rem] sm:text-[3.5rem] font-extrabold tracking-tight leading-[1.05] mb-4">
            Find creators that{" "}
            <span className="bg-gradient-to-r from-[hsl(330_80%_75%)] via-[hsl(355_85%_75%)] to-[hsl(20_90%_70%)] bg-clip-text text-transparent">
              match your vibe
            </span>
          </h1>
          <p className="text-neutral-300 text-base leading-relaxed max-w-sm mx-auto">
            Swipe through hand-picked creators. Tap the heart on one
            you&apos;d like to connect with — we&apos;ll handle the intro.
          </p>
        </div>

        <button
          onClick={onStart}
          className="w-full bg-gradient-pink text-white font-bold py-4 rounded-full text-base shadow-[0_8px_28px_-4px_rgba(240,117,179,0.6)] hover:shadow-[0_12px_36px_-4px_rgba(240,117,179,0.8)] active:scale-[0.98] transition-all"
        >
          Start swiping →
        </button>

        <div className="flex items-center justify-center gap-4 text-[11px] text-neutral-400">
          <span className="flex items-center gap-1.5">
            <span className="text-[hsl(330_80%_70%)]">★</span> 4.8 rating
          </span>
          <span className="text-neutral-700">·</span>
          <span>12k matches this week</span>
          <span className="text-neutral-700">·</span>
          <span>30s</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Swipe deck — Tinder-style card stack. Drag right to like, left to skip;
 * action buttons at the bottom do the same. After every card has been
 * swiped, calls onComplete with the slugs that were liked.
 */
function Swiping({
  onComplete,
}: {
  onComplete: (likedSlugs: string[]) => void;
}) {
  const [index, setIndex] = useState(0);

  // Refs drive the visual state during a drag — we never call setState on
  // pointermove, since each setState triggers a re-render and that's what
  // makes the gesture feel laggy. Instead we mutate the DOM directly inside
  // a requestAnimationFrame, then only sync React state at gesture-end.
  const cardRef = useRef<HTMLDivElement>(null);
  const nextCardRef = useRef<HTMLDivElement>(null);
  const likeStampRef = useRef<HTMLDivElement>(null);
  const skipStampRef = useRef<HTMLDivElement>(null);

  const dragXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lockedRef = useRef(false); // true while exit animation runs
  const startXRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTRef = useRef(0);
  const velocityRef = useRef(0); // px/ms
  const rafRef = useRef<number | null>(null);
  const likesRef = useRef<string[]>([]);

  const current: Creator | undefined = CREATORS[index];
  const next: Creator | undefined = CREATORS[index + 1];

  // Snap-back uses ease-out-expo — very fast deceleration, feels tactile.
  const SNAP = "cubic-bezier(0.16, 1, 0.3, 1)";
  const FLING = "cubic-bezier(0.32, 0.72, 0, 1)";

  function paint() {
    rafRef.current = null;
    const card = cardRef.current;
    if (!card) return;
    const dx = dragXRef.current;
    card.style.transform = `translate3d(${dx}px, 0, 0) rotate(${dx / 18}deg)`;

    if (likeStampRef.current) {
      likeStampRef.current.style.opacity = String(
        Math.max(0, Math.min(1, dx / 100))
      );
    }
    if (skipStampRef.current) {
      skipStampRef.current.style.opacity = String(
        Math.max(0, Math.min(1, -dx / 100))
      );
    }

    // Next card peeks up as the active card moves away — gives the stack
    // that subtle "rising into place" depth Tinder has.
    if (nextCardRef.current) {
      const progress = Math.min(1, Math.abs(dx) / 100);
      nextCardRef.current.style.transform = `scale(${0.95 + progress * 0.04})`;
      nextCardRef.current.style.opacity = String(0.6 + progress * 0.3);
    }
  }

  function schedulePaint() {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(paint);
  }

  function resetCardStyles(immediate: boolean) {
    const card = cardRef.current;
    if (card) {
      card.style.transition = immediate ? "none" : `transform 200ms ${SNAP}`;
      card.style.transform = "translate3d(0,0,0) rotate(0deg)";
    }
    if (likeStampRef.current) {
      likeStampRef.current.style.transition = immediate
        ? "none"
        : "opacity 160ms ease-out";
      likeStampRef.current.style.opacity = "0";
    }
    if (skipStampRef.current) {
      skipStampRef.current.style.transition = immediate
        ? "none"
        : "opacity 160ms ease-out";
      skipStampRef.current.style.opacity = "0";
    }
    if (nextCardRef.current) {
      nextCardRef.current.style.transition = immediate
        ? "none"
        : `transform 200ms ${SNAP}, opacity 200ms ease-out`;
      nextCardRef.current.style.transform = "scale(0.95)";
      nextCardRef.current.style.opacity = "0.6";
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (lockedRef.current) return;
    cardRef.current?.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    lastXRef.current = e.clientX;
    lastTRef.current = performance.now();
    velocityRef.current = 0;
    dragXRef.current = 0;
    // Kill any in-flight transitions so the drag tracks the finger 1:1.
    if (cardRef.current) cardRef.current.style.transition = "none";
    if (likeStampRef.current) likeStampRef.current.style.transition = "none";
    if (skipStampRef.current) skipStampRef.current.style.transition = "none";
    if (nextCardRef.current) nextCardRef.current.style.transition = "none";
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current || lockedRef.current) return;
    const dx = e.clientX - startXRef.current;
    dragXRef.current = dx;

    const now = performance.now();
    const dt = now - lastTRef.current;
    if (dt > 0) {
      // Light low-pass filter so a single jitter sample doesn't dominate.
      const instant = (e.clientX - lastXRef.current) / dt;
      velocityRef.current = velocityRef.current * 0.6 + instant * 0.4;
    }
    lastXRef.current = e.clientX;
    lastTRef.current = now;

    schedulePaint();
  }

  function onPointerUp() {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const dx = dragXRef.current;
    const v = velocityRef.current;
    const distanceThreshold = 100;
    const velocityThreshold = 0.6; // a quick flick triggers even at low distance

    let dir: "left" | "right" | null = null;
    if (dx > distanceThreshold || v > velocityThreshold) dir = "right";
    else if (dx < -distanceThreshold || v < -velocityThreshold) dir = "left";

    if (dir) flingOut(dir);
    else resetCardStyles(false);
  }

  function onPointerCancel() {
    isDraggingRef.current = false;
    dragXRef.current = 0;
    resetCardStyles(false);
  }

  function flingOut(dir: "left" | "right") {
    if (!current || lockedRef.current) return;
    lockedRef.current = true;

    const card = cardRef.current;
    if (card) {
      const exitX =
        dir === "right"
          ? Math.max(window.innerWidth, 700) + 100
          : -Math.max(window.innerWidth, 700) - 100;
      const exitRot = dir === "right" ? 25 : -25;
      card.style.transition = `transform 280ms ${FLING}, opacity 220ms ease-out`;
      card.style.transform = `translate3d(${exitX}px, 0, 0) rotate(${exitRot}deg)`;
      card.style.opacity = "0";
    }
    // Lock the next card at depth during exit. Previously it rose to
    // scale(1)/opacity(1) and then had to snap back to scale(0.95)/opacity(0.6)
    // when the swap happened — that visible "settle back" was the animation
    // the user didn't like. Holding it at depth means the new active card
    // just appears at the front, no rebound.
    if (nextCardRef.current) {
      nextCardRef.current.style.transition = "transform 200ms ease-out, opacity 200ms ease-out";
      nextCardRef.current.style.transform = "scale(0.95)";
      nextCardRef.current.style.opacity = "0.6";
    }
    if (likeStampRef.current) {
      likeStampRef.current.style.transition = "opacity 180ms ease-out";
      likeStampRef.current.style.opacity = dir === "right" ? "1" : "0";
    }
    if (skipStampRef.current) {
      skipStampRef.current.style.transition = "opacity 180ms ease-out";
      skipStampRef.current.style.opacity = dir === "left" ? "1" : "0";
    }

    if (dir === "right") {
      // First like ends the deck and pushes the visitor into the quiz
      // → loading → redirect funnel for that specific creator.
      likesRef.current = [...likesRef.current, current.slug];
      window.setTimeout(() => onComplete(likesRef.current), 240);
      return;
    }

    window.setTimeout(() => {
      const nextIndex = index + 1;
      if (nextIndex >= CREATORS.length) {
        onComplete(likesRef.current);
      } else {
        setIndex(nextIndex);
        // lockedRef is cleared in the layout effect below, after the new
        // card's transform is reset back to the start position.
      }
    }, 240);
  }

  // When index advances, we have to snap the active card's DOM back to its
  // resting position *before paint* so the new creator doesn't flash in at
  // the previous card's exit translation. useLayoutEffect runs synchronously
  // after DOM mutations and before the browser paints.
  useLayoutEffect(() => {
    dragXRef.current = 0;
    if (cardRef.current) cardRef.current.style.opacity = "1";
    resetCardStyles(true);
    lockedRef.current = false;
  }, [index]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!current) return null;

  return (
    <div className="min-h-screen flex flex-col px-5 py-6">
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <BrandHeader subtle />
          <span className="text-[11px] font-bold tracking-wider uppercase text-white/60">
            <span className="text-white">{index + 1}</span>
            <span className="text-white/30"> / </span>
            {CREATORS.length}
          </span>
        </div>

        <p className="text-center text-xs text-neutral-400 mb-4">
          Swipe right to like · Swipe left to skip
        </p>

        {/* Card stack */}
        <div className="relative flex-1 min-h-[460px] mb-5">
          {/* Next card (depth) */}
          {next && (
            <div
              ref={nextCardRef}
              className="absolute inset-0 rounded-3xl overflow-hidden bg-neutral-900 ring-1 ring-white/10"
              style={{
                transform: "scale(0.95)",
                opacity: 0.6,
                willChange: "transform, opacity",
              }}
            >
              {next.photo && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={next.photo}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  draggable={false}
                />
              )}
              <div className="absolute inset-0 bg-black/20" />
            </div>
          )}

          {/* Active card */}
          <div
            ref={cardRef}
            className="absolute inset-0 rounded-3xl overflow-hidden bg-neutral-900 ring-1 ring-white/15 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)] cursor-grab active:cursor-grabbing select-none"
            style={{
              transform: "translate3d(0,0,0) rotate(0deg)",
              touchAction: "pan-y",
              willChange: "transform",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
          >
            {current.photo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={current.photo}
                alt=""
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-700 to-neutral-900" />
            )}

            <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 via-black/55 to-transparent pointer-events-none" />

            {/* LIKE / SKIP stamps */}
            <div
              ref={likeStampRef}
              className="absolute top-10 right-6 text-[#4ade80] border-[3px] border-[#4ade80] rounded-2xl px-4 py-1.5 text-2xl font-extrabold rotate-12 pointer-events-none tracking-wider"
              style={{ opacity: 0, willChange: "opacity" }}
            >
              LIKE
            </div>
            <div
              ref={skipStampRef}
              className="absolute top-10 left-6 text-red-400 border-[3px] border-red-400 rounded-2xl px-4 py-1.5 text-2xl font-extrabold -rotate-12 pointer-events-none tracking-wider"
              style={{ opacity: 0, willChange: "opacity" }}
            >
              SKIP
            </div>

            {/* Bottom info */}
            <div className="absolute left-5 bottom-5 right-5 pointer-events-none">
              <div className="flex items-baseline gap-2 mb-1">
                <h2 className="text-3xl font-extrabold drop-shadow-md leading-tight">
                  {current.name}{" "}
                  <span className="text-white/85 font-semibold text-2xl">
                    {current.age}
                  </span>
                </h2>
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#3b82f6] text-white text-[10px] font-bold flex-shrink-0"
                  title="verified"
                >
                  ✓
                </span>
              </div>
              <p className="text-xs text-white/80 mb-2">
                📍 {current.city}
              </p>
              <p className="text-sm text-white/90 leading-relaxed mb-3 line-clamp-2">
                {current.bio}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {current.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] uppercase tracking-wider font-bold bg-white/15 backdrop-blur-md px-2 py-1 rounded-full border border-white/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-5 pb-4">
          <button
            onClick={() => flingOut("left")}
            aria-label="Skip"
            className="w-14 h-14 rounded-full bg-white/[0.06] border border-white/15 backdrop-blur-md text-red-400 text-2xl font-bold hover:scale-105 hover:border-red-400/60 active:scale-95 transition-all disabled:opacity-50"
          >
            ✕
          </button>
          <button
            onClick={() => flingOut("right")}
            aria-label="Like"
            className="w-20 h-20 rounded-full bg-gradient-pink text-white text-3xl shadow-[0_8px_28px_-4px_rgba(240,117,179,0.6)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            ♥
          </button>
        </div>
      </div>
    </div>
  );
}

function Question({
  index,
  total,
  title,
  subtitle,
  options,
  onSelect,
}: {
  index: number;
  total: number;
  title: string;
  subtitle?: string;
  options: string[];
  onSelect: () => void;
}) {
  const progress = (index + 1) / total;

  return (
    <div className="min-h-screen flex flex-col px-5 py-7">
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <BrandHeader subtle />
          <span className="text-[11px] font-bold tracking-wider uppercase text-white/60">
            <span className="text-white">{index + 1}</span>
            <span className="text-white/30"> / </span>
            {total}
          </span>
        </div>

        <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-9">
          <div
            className="h-full bg-gradient-pink transition-[width] duration-500 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>

        <div className="animate-[fadeIn_350ms_ease-out]">
          <h2
            className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 leading-tight"
            dangerouslySetInnerHTML={{ __html: title }}
          />
          {subtitle ? (
            <p className="text-sm text-neutral-400 mb-7 leading-relaxed">
              {subtitle}
            </p>
          ) : (
            <div className="mb-7" />
          )}

          <div className="space-y-3">
            {options.map((label) => (
              <button
                key={label}
                onClick={onSelect}
                className="group w-full flex items-center justify-between gap-3 bg-white/[0.04] hover:bg-white/[0.07] backdrop-blur-md border border-white/10 hover:border-[hsl(330_80%_70%)]/60 active:scale-[0.99] transition-all rounded-2xl px-5 py-4 text-left shadow-[0_4px_18px_rgba(0,0,0,0.18)]"
              >
                <span className="text-base font-semibold">{label}</span>
                <span className="text-white/30 group-hover:text-[hsl(330_80%_70%)] group-hover:translate-x-0.5 transition-all text-lg">
                  →
                </span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-neutral-600 mt-auto pt-8 text-center">
          Tap whichever feels right · No wrong answers
        </p>
      </div>
    </div>
  );
}

/**
 * Loading screen with animated percentage and stage checklist. Single
 * timestamp-based clock so the % advances smoothly across all stages.
 */
function LoadingScreen({
  stages,
  finalLabel,
}: {
  stages: { label: string; duration: number }[];
  finalLabel: string;
}) {
  const [stage, setStage] = useState(0);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    let cumulative = 0;
    const stageEnds = stages.map((s) => (cumulative += s.duration));
    const total = stageEnds[stageEnds.length - 1];

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / total) * 100));
      setPercent(pct);

      const newStage = stageEnds.findIndex((end) => elapsed < end);
      setStage(newStage === -1 ? stages.length - 1 : newStage);

      if (elapsed >= total) clearInterval(interval);
    }, 50);

    return () => clearInterval(interval);
  }, [stages]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10">
      <div className="max-w-sm w-full animate-[fadeIn_300ms_ease-out]">
        <div className="flex justify-center mb-7">
          <BrandHeader subtle />
        </div>

        <div className="text-center space-y-6">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-white/10" />
            <div
              className="absolute inset-0 rounded-full border-2 border-transparent border-t-[hsl(330_80%_70%)] animate-spin"
              style={{ animationDuration: "1.2s" }}
            />
            <div className="absolute inset-1 rounded-full bg-white/[0.04] backdrop-blur-md flex items-center justify-center text-2xl font-extrabold tabular-nums">
              {percent}%
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xl font-bold transition-all duration-300">
              {stages[stage]?.label ?? finalLabel}
            </p>
            <p className="text-sm text-neutral-500">
              Reaching out on your behalf
            </p>
          </div>

          <div className="space-y-2 pt-2 px-1">
            {stages.map((s, i) => (
              <div
                key={s.label}
                className={`flex items-center gap-2.5 text-xs transition-opacity duration-300 ${
                  i <= stage ? "opacity-100" : "opacity-30"
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full grid place-items-center text-[8px] flex-shrink-0 ${
                    i < stage
                      ? "bg-[#4ade80] text-black"
                      : i === stage
                        ? "bg-[hsl(330_80%_70%)] text-white animate-pulse"
                        : "bg-white/10 text-white/30"
                  }`}
                >
                  {i < stage ? "✓" : "•"}
                </span>
                <span className="text-left text-white/75">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Results({ likes }: { likes: string[] }) {
  // Show liked creators first; if user skipped everyone, fall back to all.
  const ordered =
    likes.length > 0
      ? [
          ...CREATORS.filter((c) => likes.includes(c.slug)),
          ...CREATORS.filter((c) => !likes.includes(c.slug)),
        ]
      : CREATORS;

  const matchCount = likes.length || CREATORS.length;
  const headline =
    likes.length > 0
      ? `${matchCount} ${matchCount === 1 ? "creator" : "creators"} matched with you`
      : "Your top picks";

  return (
    <div className="min-h-screen px-4 sm:px-6 py-10">
      <div className="max-w-6xl mx-auto animate-[fadeIn_500ms_ease-out]">
        <div className="text-center mb-8 sm:mb-10 space-y-4">
          <div className="flex justify-center">
            <BrandHeader subtle />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/30 backdrop-blur-md">
            <span className="text-[#4ade80] text-xs">✓</span>
            <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#4ade80]">
              {matchCount} match{matchCount === 1 ? "" : "es"} ready
            </span>
          </div>
          <div>
            <h1 className="text-[2rem] sm:text-4xl font-extrabold tracking-tight mb-3">
              {headline}
            </h1>
            <p className="text-sm text-neutral-400 max-w-md mx-auto">
              Tap any profile to view their page — they&apos;re expecting you.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {ordered.map((c) => (
            <CreatorCard key={c.slug} creator={c} />
          ))}
        </div>

        <p className="mt-10 text-center text-[11px] text-neutral-600 leading-relaxed max-w-md mx-auto">
          Independent professionals. All featured profiles are 18+ and operate
          under their own platform terms.
        </p>
      </div>
    </div>
  );
}
