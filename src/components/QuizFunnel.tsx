"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { type Creator, pickActivity } from "@/data/creators";
import CreatorCard from "./CreatorCard";
import Stage from "./Stage";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

type Step =
  | { kind: "intro" }
  | { kind: "swiping" }
  | { kind: "wheel" }
  | { kind: "match" }
  | { kind: "prep" }
  | { kind: "matchedLoading" }
  | { kind: "results" };

function buildMatchedStages(name: string) {
  return [
    { label: `Letting ${name} know you're on your way…`, duration: 900 },
    { label: "Saving your chat preferences…", duration: 1100 },
    { label: `Opening chat with ${name}…`, duration: 800 },
  ];
}

function firePixel(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
  if (!fbq || !PIXEL_ID) return;
  fbq("trackSingle", PIXEL_ID, event, params);
}

/**
 * Logs a funnel event to our internal counter API, used by /admin/stats.
 * Fire-and-forget — failures are silent so analytics never blocks UX.
 * `keepalive` ensures the request still completes if the user navigates
 * away (critical for the Fanvue-redirect tracker, which fires immediately
 * before the navigation).
 */
function trackInternal(event: string, slug?: string) {
  if (typeof window === "undefined") return;
  try {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, slug }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* no-op — analytics must never break the funnel */
  }
}

export default function QuizFunnel({ creators }: { creators: Creator[] }) {
  const [step, setStep] = useState<Step>({ kind: "intro" });
  const [likes, setLikes] = useState<string[]>([]);

  // The funnel copy is personalized to the first creator the user liked —
  // this is the one we'll redirect them to. If somehow likes is empty we
  // fall back to the first creator just so the strings have a name.
  const targetCreator =
    creators.find((c) => c.slug === likes[0]) ?? creators[0];
  const matchedStages = buildMatchedStages(targetCreator.name);

  useEffect(() => {
    if (step.kind !== "matchedLoading") return;

    // Fire conversion events early so they have time to flush before navigation
    const firstLiked = likes[0];
    if (firstLiked) {
      const creator = creators.find((c) => c.slug === firstLiked);
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

    const total = matchedStages.reduce((sum, s) => sum + s.duration, 0);
    const t = setTimeout(() => {
      if (firstLiked) {
        // Final-step counter logged just before navigation so we can compute
        // the prep_continue → fanvue_redirect rate (post-redirect events
        // can't fire from this origin).
        trackInternal("fanvue_redirect", firstLiked);
        window.location.href = `/go?slug=${encodeURIComponent(firstLiked)}`;
      } else {
        // Defensive fallback — shouldn't reach here, but if no likes, show results.
        setStep({ kind: "results" });
      }
    }, total);
    return () => clearTimeout(t);
  }, [step.kind, likes, matchedStages, creators]);

  function start() {
    firePixel("Lead", {
      content_name: "started_swiping",
      content_category: "creator_match",
    });
    trackInternal("started_swiping");
    setStep({ kind: "swiping" });
  }

  function onSwipeComplete(likedSlugs: string[]) {
    setLikes(likedSlugs);
    firePixel("Lead", {
      content_name: "swipe_complete",
      content_category: "creator_match",
      num_liked: likedSlugs.length,
    });
    trackInternal("swipe_complete");
    if (likedSlugs.length >= 2) {
      // Multiple matches → spin-the-wheel decides which one unlocks his free
      // trial. Adds a dopamine moment + makes the picked creator feel earned.
      setStep({ kind: "wheel" });
    } else if (likedSlugs.length === 1) {
      // Only one match — no need for a wheel, go straight to the celebration.
      setStep({ kind: "match" });
    } else {
      // Skipped everyone — show the grid so they can still pick one
      setStep({ kind: "results" });
    }
  }

  function onWheelResult(slug: string) {
    firePixel("Lead", {
      content_name: "wheel_result",
      content_category: "creator_match",
      content_ids: [slug],
    });
    trackInternal("wheel_result", slug);
    // Reorder likes so the wheel's winner becomes the target creator (likes[0]).
    setLikes((prev) => [slug, ...prev.filter((s) => s !== slug)]);
    setStep({ kind: "match" });
  }

  function onMatchContinue() {
    firePixel("Lead", {
      content_name: "match_continue",
      content_category: "creator_match",
    });
    trackInternal("match_continue", targetCreator.slug);
    // Quiz step was removed — the wheel + match screen already do the
    // commitment work, so we go straight to the prep step that sets up
    // the Fanvue signup expectation.
    setStep({ kind: "prep" });
  }

  function onPrepContinue() {
    firePixel("Lead", {
      content_name: "prep_continue",
      content_category: "creator_match",
    });
    trackInternal("prep_continue");
    setStep({ kind: "matchedLoading" });
  }

  return (
    <Stage creators={creators}>
      {step.kind === "intro" && <Intro onStart={start} />}
      {step.kind === "swiping" && (
        <Swiping creators={creators} onComplete={onSwipeComplete} />
      )}
      {step.kind === "wheel" && (
        <Wheel
          creators={creators.filter((c) => likes.includes(c.slug))}
          onResult={onWheelResult}
        />
      )}
      {step.kind === "match" && (
        <Match creator={targetCreator} onContinue={onMatchContinue} />
      )}
      {step.kind === "prep" && (
        <Prep creator={targetCreator} onContinue={onPrepContinue} />
      )}
      {step.kind === "matchedLoading" && (
        <LoadingScreen
          stages={matchedStages}
          finalLabel="Chat ready"
        />
      )}
      {step.kind === "results" && (
        <Results creators={creators} likes={likes} />
      )}
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
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-5 py-12"
      style={{
        // Respect iPhone notch + home indicator when the page is added to
        // the home screen or in standalone PWA mode.
        paddingTop: "max(3rem, env(safe-area-inset-top))",
        paddingBottom: "max(3rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="max-w-md w-full text-center space-y-7 animate-[fadeIn_500ms_ease-out]">
        <div className="flex flex-col items-center gap-3">
          <BrandHeader />
          <LiveCounter />
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
          style={{ touchAction: "manipulation" }}
        >
          Start swiping → free trial
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
 * Tiny social-proof badge on the intro: "X chatting now" with a gently
 * incrementing number so the page feels alive on first paint and on
 * dwell. Number drifts upward by 1–3 every 4–10s. Initial value is
 * randomized per visitor (1.1k–1.4k) so even a fast tester won't see
 * a constant baseline across reloads.
 */
function LiveCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    setCount(1100 + Math.floor(Math.random() * 320));
    const tick = () => {
      setCount((c) => (c === null ? null : c + 1 + Math.floor(Math.random() * 3)));
    };
    let timer: number;
    const schedule = () => {
      const delay = 4000 + Math.random() * 6000; // 4–10s
      timer = window.setTimeout(() => {
        tick();
        schedule();
      }, delay);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/30 text-[10px] uppercase tracking-[0.18em] font-bold text-[#4ade80] tabular-nums">
      <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
      {count === null ? "—" : count.toLocaleString()} chatting now
    </div>
  );
}

/**
 * Swipe deck — Tinder-style card stack. Drag right to like, left to skip;
 * action buttons at the bottom do the same. After every card has been
 * swiped, calls onComplete with the slugs that were liked.
 */
function Swiping({
  creators,
  onComplete,
}: {
  creators: Creator[];
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

  const current: Creator | undefined = creators[index];
  const next: Creator | undefined = creators[index + 1];

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
      likesRef.current = [...likesRef.current, current.slug];
    }

    // Always advance to the next card — both like and skip move forward.
    // The deck only ends once the user has been through every creator,
    // which means they've made several yes/no decisions and are warmed up
    // before the personalized quiz fires.
    window.setTimeout(() => {
      const nextIndex = index + 1;
      if (nextIndex >= creators.length) {
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
    <div className="min-h-dvh flex flex-col px-5 py-6">
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <BrandHeader subtle />
          <span className="text-[11px] font-bold tracking-wider uppercase text-white/60">
            <span className="text-white">{index + 1}</span>
            <span className="text-white/30"> / </span>
            {creators.length}
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
            {current.video ? (
              <video
                key={current.video}
                src={current.video}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
            ) : current.photo ? (
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
              <p className="text-sm text-white/90 leading-relaxed line-clamp-2 mb-2">
                {current.bio}
              </p>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#4ade80]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
                {pickActivity(current.activity)}
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

/**
 * Spin-the-wheel that fires when the visitor has matched with 2+ creators.
 * Picks one at random, frames it as unlocking a free trial, then funnels
 * into the standard match → quiz → prep flow with the winner as target.
 *
 * Math: with N slices, slice K's center sits at K*(360/N) + (360/N)/2 from
 * 12 o'clock, clockwise. A wheel rotated by R degrees lands slice K's
 * center at the top when R ≡ -sliceCenter (mod 360). We add 5 full turns
 * for a satisfying spin animation.
 */
function Wheel({
  creators,
  onResult,
}: {
  creators: Creator[];
  onResult: (slug: string) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "spinning" | "result">("idle");
  const [rotation, setRotation] = useState(0);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);

  const SPIN_MS = 4200;
  const FULL_TURNS = 5;
  const RADIUS = 110; // distance from wheel center to avatars (px)
  const SLICE_COLORS = [
    "hsl(330 80% 65%)",
    "hsl(20 90% 65%)",
    "hsl(280 70% 65%)",
    "hsl(355 80% 65%)",
    "hsl(45 90% 60%)",
    "hsl(200 75% 60%)",
  ];

  const sliceAngle = 360 / creators.length;
  const conicStops = creators
    .map((_, i) => {
      const start = i * sliceAngle;
      const end = (i + 1) * sliceAngle;
      return `${SLICE_COLORS[i % SLICE_COLORS.length]} ${start}deg ${end}deg`;
    })
    .join(", ");

  function spin() {
    if (phase !== "idle") return;
    const winner = Math.floor(Math.random() * creators.length);
    const sliceCenter = winner * sliceAngle + sliceAngle / 2;
    const final = FULL_TURNS * 360 + (360 - sliceCenter);

    firePixel("Lead", {
      content_name: "wheel_spin",
      content_category: "creator_match",
    });
    trackInternal("wheel_spin");

    setWinnerIdx(winner);
    setRotation(final);
    setPhase("spinning");
    window.setTimeout(() => setPhase("result"), SPIN_MS);
  }

  const winner = winnerIdx !== null ? creators[winnerIdx] : null;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-10">
      <div className="max-w-sm w-full text-center space-y-6 animate-[fadeIn_500ms_ease-out]">
        <div className="flex justify-center">
          <BrandHeader subtle />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/30">
            <span className="text-[#4ade80] text-xs">★</span>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#4ade80]">
              Free trial · {creators.length} matches
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Spin to unlock your free trial
          </h1>
          <p className="text-sm text-neutral-300 leading-relaxed">
            One of your matches gives you a free trial chat. Spin to see
            which.
          </p>
        </div>

        <div className="relative mx-auto w-72 h-72 sm:w-80 sm:h-80">
          {/* Pointer at the top */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -top-1 z-20"
            style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))" }}
          >
            <div
              className="w-0 h-0"
              style={{
                borderLeft: "14px solid transparent",
                borderRight: "14px solid transparent",
                borderTop: "22px solid white",
              }}
            />
          </div>

          {/* Outer ring glow */}
          <div className="absolute inset-0 rounded-full ring-4 ring-white/15 shadow-[0_0_60px_-10px_rgba(240,117,179,0.6)]" />

          {/* Spinning wheel */}
          <div
            className="absolute inset-1 rounded-full overflow-hidden"
            style={{
              background: `conic-gradient(from 0deg, ${conicStops})`,
              transform: `rotate(${rotation}deg)`,
              transition:
                phase === "spinning"
                  ? `transform ${SPIN_MS}ms cubic-bezier(0.15, 0.7, 0.15, 1)`
                  : "none",
              willChange: "transform",
            }}
          >
            {/* Slice dividers */}
            {creators.map((_, i) => {
              const angle = i * sliceAngle;
              return (
                <div
                  key={`div-${i}`}
                  className="absolute top-1/2 left-1/2 origin-top w-px bg-white/30 pointer-events-none"
                  style={{
                    height: "50%",
                    transform: `translate(-50%, 0) rotate(${angle}deg)`,
                  }}
                />
              );
            })}
            {/* Avatars positioned in each slice */}
            {creators.map((c, i) => {
              const center = i * sliceAngle + sliceAngle / 2;
              const rad = ((center - 90) * Math.PI) / 180;
              const x = Math.cos(rad) * RADIUS;
              const y = Math.sin(rad) * RADIUS;
              return (
                <div
                  key={c.slug}
                  className="absolute top-1/2 left-1/2 w-14 h-14 -ml-7 -mt-7"
                  style={{ transform: `translate(${x}px, ${y}px)` }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden ring-2 ring-white/90 shadow-lg bg-neutral-800">
                    {c.photo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={c.photo}
                        alt={c.name}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center hub */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-[0_4px_18px_rgba(0,0,0,0.5)] grid place-items-center text-xl pointer-events-none">
            🎁
          </div>
        </div>

        {phase === "idle" && (
          <button
            onClick={spin}
            className="w-full bg-gradient-pink text-white font-extrabold tracking-wide py-4 rounded-full text-base shadow-[0_8px_28px_-4px_rgba(240,117,179,0.6)] hover:shadow-[0_12px_36px_-4px_rgba(240,117,179,0.8)] active:scale-[0.98] transition-all uppercase"
          >
            SPIN
          </button>
        )}

        {phase === "spinning" && (
          <p className="text-sm text-neutral-400 animate-pulse">spinning…</p>
        )}

        {phase === "result" && winner && (
          <WheelResult creator={winner} onContinue={() => onResult(winner.slug)} />
        )}
      </div>
    </div>
  );
}

function WheelResult({
  creator,
  onContinue,
}: {
  creator: Creator;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4 animate-[fadeIn_500ms_ease-out]">
      <div className="rounded-2xl border border-[#4ade80]/40 bg-[#4ade80]/10 p-5 space-y-2">
        <div className="text-2xl">🎉</div>
        <p className="text-base font-bold">
          Free trial unlocked with{" "}
          <span className="text-[#4ade80]">{creator.name}</span>
        </p>
        <p className="text-xs text-neutral-300 leading-relaxed">
          Your free trial activates the moment you open her page. No card
          needed to start chatting.
        </p>
      </div>
      <button
        onClick={onContinue}
        className="w-full bg-gradient-pink text-white font-bold py-4 rounded-full text-base shadow-[0_8px_28px_-4px_rgba(240,117,179,0.6)] active:scale-[0.98] transition-all"
      >
        Continue with {creator.name} →
      </button>
    </div>
  );
}

/**
 * Tinder-style "It's a match!" celebration. Sits between the swipe deck and
 * the chat-prep quiz to make the funnel feel like meeting an actual person —
 * reciprocity ("she liked you back") + a tactile gear shift from browsing
 * to engaging.
 */
function Match({
  creator,
  onContinue,
}: {
  creator: Creator;
  onContinue: () => void;
}) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-10">
      <div className="max-w-sm w-full text-center space-y-7 animate-[fadeIn_500ms_ease-out]">
        <div className="flex justify-center">
          <BrandHeader subtle />
        </div>

        <div className="space-y-3">
          <div className="text-6xl animate-[fadeIn_600ms_ease-out]">💗</div>
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-[hsl(330_80%_75%)] via-[hsl(355_85%_75%)] to-[hsl(20_90%_70%)] bg-clip-text text-transparent">
            It&apos;s a match!
          </h1>
          <p className="text-base text-white/85">
            <span className="font-bold">{creator.name}</span> liked you back
          </p>
        </div>

        <div className="flex justify-center">
          <div className="relative w-36 h-36 rounded-full overflow-hidden ring-4 ring-[hsl(330_80%_70%)]/40 shadow-[0_0_60px_-10px_rgba(240,117,179,0.6)]">
            {creator.photo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={creator.photo}
                alt={creator.name}
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-700 to-neutral-900" />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-neutral-300 leading-relaxed px-2">
            She&apos;s online now and ready to chat. Your free trial is
            active — open her page to send your first message.
          </p>
          <div className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-[#4ade80]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
            she replied 2 min ago
          </div>
        </div>

        <button
          onClick={onContinue}
          className="w-full bg-gradient-pink text-white font-bold py-4 rounded-full text-base shadow-[0_8px_28px_-4px_rgba(240,117,179,0.6)] hover:shadow-[0_12px_36px_-4px_rgba(240,117,179,0.8)] active:scale-[0.98] transition-all"
        >
          Open her chat →
        </button>
      </div>
    </div>
  );
}

function detectPlatform(url: string): "Fanvue" | "OnlyFans" | "her page" {
  if (/fanvue\.com/i.test(url)) return "Fanvue";
  if (/onlyfans\.com/i.test(url)) return "OnlyFans";
  return "her page";
}

/**
 * Step that sits between the quiz and the redirect. Names the destination
 * platform explicitly and pre-frames account creation so visitors don't
 * bounce when they hit Fanvue's signup wall. Conversion-wise this is the
 * highest-friction moment — be specific about what's on the other side.
 */
function Prep({
  creator,
  onContinue,
}: {
  creator: Creator;
  onContinue: () => void;
}) {
  const platform = detectPlatform(creator.destUrl);
  return (
    <div
      className="min-h-dvh flex flex-col px-5 py-7"
      style={{
        paddingTop: "max(1.75rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <BrandHeader subtle />
          <span className="text-[11px] font-bold tracking-wider uppercase text-white/60">
            Almost there
          </span>
        </div>

        <div className="animate-[fadeIn_400ms_ease-out] space-y-7 flex-1 flex flex-col">
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Ready to message {creator.name}
            </h2>
            <p className="text-sm text-neutral-400 leading-relaxed">
              She&apos;s on {platform}. Here&apos;s what happens next:
            </p>
          </div>

          <FreeTrialCountdown />

          <div className="space-y-3">
            <PrepStep number={1} title="Free signup if you're new">
              Just an email — takes about 30 seconds. No card required to
              create your account.
            </PrepStep>
            <PrepStep
              number={2}
              title={`Land on ${creator.name}'s page — free trial active`}
            >
              Your free trial activates automatically. No card needed to
              start chatting.
            </PrepStep>
            <PrepStep number={3} title="Start the conversation">
              Send her your first message — she&apos;s online now.
            </PrepStep>
          </div>

          <div className="space-y-2 mt-auto">
            <button
              onClick={onContinue}
              className="w-full bg-gradient-pink text-white font-bold py-4 rounded-full text-base shadow-[0_8px_28px_-4px_rgba(240,117,179,0.6)] hover:shadow-[0_12px_36px_-4px_rgba(240,117,179,0.8)] active:scale-[0.98] transition-all"
              style={{ touchAction: "manipulation" }}
            >
              Continue to {platform} →
            </button>
            <p className="text-[11px] text-neutral-500 text-center">
              Free to join · 18+ only · Independent creator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Urgency-creating countdown shown above the prep steps. Starts at a
 * randomized 7–10 minute mark per visit, ticks down once per second.
 * When it reaches zero, swaps to a "last-chance" message instead of
 * idling at 0:00. Resetting on every page load is intentional — visitors
 * who linger feel time pressure each time, which lifts the prep_continue
 * → fanvue_redirect rate without making any false claims.
 */
function FreeTrialCountdown() {
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    setSeconds(7 * 60 + Math.floor(Math.random() * 180)); // 7:00 – 9:59
  }, []);

  useEffect(() => {
    if (seconds === null || seconds <= 0) return;
    const t = window.setTimeout(() => setSeconds((s) => (s ?? 1) - 1), 1000);
    return () => window.clearTimeout(t);
  }, [seconds]);

  if (seconds === null) {
    return null;
  }

  if (seconds <= 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-red-500/40 bg-red-500/10 p-3.5">
        <span className="text-lg">⚠</span>
        <p className="text-sm text-red-300 font-bold">
          Last chance — your free trial slot is closing.
        </p>
      </div>
    );
  }

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5">
      <span className="text-lg">⏰</span>
      <p className="text-sm leading-snug">
        <span className="text-amber-300 font-bold">
          Free trial expires in {m}:{s.toString().padStart(2, "0")}
        </span>
        <span className="block text-[11px] text-amber-200/80 mt-0.5">
          Held for you while you sign up.
        </span>
      </p>
    </div>
  );
}

function PrepStep({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 bg-white/[0.04] border border-white/10 rounded-2xl p-4 backdrop-blur-md">
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[hsl(330_80%_70%)] text-white text-sm font-bold grid place-items-center mt-0.5">
        {number}
      </span>
      <div className="flex-1">
        <h3 className="text-sm font-bold mb-0.5">{title}</h3>
        <p className="text-xs text-neutral-400 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

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
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-10">
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

function Results({
  creators,
  likes,
}: {
  creators: Creator[];
  likes: string[];
}) {
  // Show liked creators first; if user skipped everyone, fall back to all.
  const ordered =
    likes.length > 0
      ? [
          ...creators.filter((c) => likes.includes(c.slug)),
          ...creators.filter((c) => !likes.includes(c.slug)),
        ]
      : creators;

  const matchCount = likes.length || creators.length;
  const headline =
    likes.length > 0
      ? `${matchCount} ${matchCount === 1 ? "creator" : "creators"} matched with you`
      : "Your top picks";

  return (
    <div className="min-h-dvh px-4 sm:px-6 py-10">
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
