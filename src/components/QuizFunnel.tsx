"use client";

import { useEffect, useRef, useState } from "react";
import { CREATORS, type Creator } from "@/data/creators";
import CreatorCard from "./CreatorCard";
import Stage from "./Stage";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

type Step =
  | { kind: "intro" }
  | { kind: "swiping" }
  | { kind: "matchedLoading" }
  | { kind: "results" };

const MATCHED_STAGES = [
  { label: "Looking at the people you liked…", duration: 900 },
  { label: "Confirming your matches…", duration: 1100 },
  { label: "Opening their profiles…", duration: 800 },
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

  // Auto-advance from "Confirming matches…" → results
  useEffect(() => {
    if (step.kind !== "matchedLoading") return;
    const total = MATCHED_STAGES.reduce((sum, s) => sum + s.duration, 0);
    const t = setTimeout(() => setStep({ kind: "results" }), total);
    return () => clearTimeout(t);
  }, [step.kind]);

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
    setStep({ kind: "matchedLoading" });
  }

  return (
    <Stage>
      {step.kind === "intro" && <Intro onStart={start} />}
      {step.kind === "swiping" && <Swiping onComplete={onSwipeComplete} />}
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
            Swipe through hand-picked creators. Tap the heart on the ones you
            like, skip the rest. We&apos;ll connect you with your matches.
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
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDir, setExitDir] = useState<"left" | "right" | null>(null);
  const startX = useRef(0);
  const likesRef = useRef<string[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);

  const current: Creator | undefined = CREATORS[index];
  const next: Creator | undefined = CREATORS[index + 1];

  function startDrag(clientX: number, pointerId?: number) {
    if (exitDir) return;
    if (pointerId !== undefined) {
      cardRef.current?.setPointerCapture(pointerId);
    }
    setIsDragging(true);
    startX.current = clientX;
  }

  function moveDrag(clientX: number) {
    if (!isDragging || exitDir) return;
    setDragX(clientX - startX.current);
  }

  function endDrag() {
    if (!isDragging) return;
    setIsDragging(false);
    const threshold = 100;
    if (dragX > threshold) {
      goNext("right");
    } else if (dragX < -threshold) {
      goNext("left");
    } else {
      setDragX(0);
    }
  }

  function goNext(dir: "left" | "right") {
    if (!current || exitDir) return;
    if (dir === "right") {
      likesRef.current = [...likesRef.current, current.slug];
    }
    setExitDir(dir);
    setTimeout(() => {
      const nextIndex = index + 1;
      if (nextIndex >= CREATORS.length) {
        onComplete(likesRef.current);
      } else {
        setIndex(nextIndex);
        setDragX(0);
        setExitDir(null);
      }
    }, 350);
  }

  if (!current) return null;

  const rotation =
    exitDir === "left" ? -25 : exitDir === "right" ? 25 : dragX / 18;
  const translateX =
    exitDir === "left" ? -700 : exitDir === "right" ? 700 : dragX;
  const opacity = exitDir ? 0 : 1;

  const likeOpacity = Math.max(0, Math.min(1, dragX / 100));
  const skipOpacity = Math.max(0, Math.min(1, -dragX / 100));

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
            <div className="absolute inset-0 rounded-3xl overflow-hidden bg-neutral-900 ring-1 ring-white/10 scale-95 opacity-60">
              {next.photo && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={next.photo}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
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
              transform: `translateX(${translateX}px) rotate(${rotation}deg)`,
              transition: isDragging
                ? "none"
                : "transform 350ms ease-out, opacity 300ms ease-out",
              opacity,
              touchAction: "pan-y",
            }}
            onPointerDown={(e) => startDrag(e.clientX, e.pointerId)}
            onPointerMove={(e) => moveDrag(e.clientX)}
            onPointerUp={endDrag}
            onPointerCancel={() => {
              setIsDragging(false);
              setDragX(0);
            }}
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

            <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/50 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 via-black/55 to-transparent" />

            {/* LIKE / SKIP stamps */}
            <div
              className="absolute top-10 right-6 text-[#4ade80] border-[3px] border-[#4ade80] rounded-2xl px-4 py-1.5 text-2xl font-extrabold rotate-12 pointer-events-none transition-opacity tracking-wider"
              style={{ opacity: likeOpacity }}
            >
              LIKE
            </div>
            <div
              className="absolute top-10 left-6 text-red-400 border-[3px] border-red-400 rounded-2xl px-4 py-1.5 text-2xl font-extrabold -rotate-12 pointer-events-none transition-opacity tracking-wider"
              style={{ opacity: skipOpacity }}
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
            onClick={() => goNext("left")}
            disabled={!!exitDir}
            aria-label="Skip"
            className="w-14 h-14 rounded-full bg-white/[0.06] border border-white/15 backdrop-blur-md text-red-400 text-2xl font-bold hover:scale-105 hover:border-red-400/60 active:scale-95 transition-all disabled:opacity-50"
          >
            ✕
          </button>
          <button
            onClick={() => goNext("right")}
            disabled={!!exitDir}
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

/**
 * Loading screen with animated percentage and stage checklist. Single
 * timestamp-based clock so the % advances smoothly across all stages
 * without restarting when the active stage changes.
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
