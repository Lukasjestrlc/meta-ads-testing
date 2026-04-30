"use client";

import { useEffect, useState } from "react";
import { CREATORS } from "@/data/creators";
import CreatorCard from "./CreatorCard";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

type Step =
  | { kind: "intro" }
  | { kind: "question"; index: number }
  | { kind: "loading" }
  | { kind: "results" };

const QUESTIONS: { title: string; options: string[] }[] = [
  {
    title: "What style do you usually like?",
    options: ["Chill & cozy", "Outdoorsy & fitness", "Artsy & alt", "Glam & fashion"],
  },
  {
    title: "What kind of energy?",
    options: [
      "Sweet & wholesome",
      "Funny & playful",
      "Bold & confident",
      "Calm & mysterious",
    ],
  },
  {
    title: "How often do you scroll?",
    options: ["All day, hooked", "Few times a day", "Once a day", "Now and then"],
  },
  {
    title: "Favorite type of post?",
    options: ["Photos", "Short videos", "Stories", "Lives"],
  },
];

const LOADING_MS = 3500;

/**
 * Fires Meta Pixel Lead event when the visitor finishes the quiz. The Pixel
 * is loaded by HomepagePixel on the same page, so fbq is in memory.
 */
function fireLead() {
  if (typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
  if (!fbq || !PIXEL_ID) return;
  fbq("trackSingle", PIXEL_ID, "Lead", {
    content_name: "quiz_complete",
    content_category: "creator_match",
  });
}

export default function QuizFunnel() {
  const [step, setStep] = useState<Step>({ kind: "intro" });

  // Auto-advance from "Matching you…" screen to results.
  useEffect(() => {
    if (step.kind !== "loading") return;
    const t = setTimeout(() => setStep({ kind: "results" }), LOADING_MS);
    return () => clearTimeout(t);
  }, [step.kind]);

  function start() {
    setStep({ kind: "question", index: 0 });
  }

  function answer() {
    if (step.kind !== "question") return;
    const next = step.index + 1;
    if (next < QUESTIONS.length) {
      setStep({ kind: "question", index: next });
    } else {
      fireLead();
      setStep({ kind: "loading" });
    }
  }

  if (step.kind === "intro") return <Intro onStart={start} />;
  if (step.kind === "question") {
    const q = QUESTIONS[step.index];
    return (
      <Question
        key={step.index}
        title={q.title}
        options={q.options}
        progress={(step.index + 1) / QUESTIONS.length}
        onSelect={answer}
      />
    );
  }
  if (step.kind === "loading") return <Loading />;
  return <Results />;
}

// ─────────────────────── screens ───────────────────────

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 py-10 bg-[hsl(0_0%_4%)] text-white animate-[fadeIn_400ms_ease-out]">
      <div className="max-w-md w-full text-center space-y-7">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-[hsl(330_80%_70%)] font-bold mb-3">
            ✿ peach club
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05]">
            Find creators that match your vibe
          </h1>
          <p className="text-neutral-300 mt-4 text-sm sm:text-base leading-relaxed">
            Take a 60-second quiz and we&apos;ll suggest a few creators
            you&apos;d probably enjoy. Hand-picked. Independent. No fluff.
          </p>
        </div>

        <button
          onClick={onStart}
          className="w-full bg-gradient-pink text-white font-bold py-4 rounded-full text-base shadow-[0_8px_28px_-8px_rgba(240,117,179,0.6)] active:scale-[0.98] transition-transform"
        >
          Start the quiz →
        </button>

        <p className="text-[11px] text-neutral-500">
          No signup. No card. Just answers.
        </p>
      </div>
    </main>
  );
}

function Question({
  title,
  options,
  progress,
  onSelect,
}: {
  title: string;
  options: string[];
  progress: number;
  onSelect: () => void;
}) {
  return (
    <main className="min-h-screen flex flex-col px-5 py-6 bg-[hsl(0_0%_4%)] text-white animate-[fadeIn_300ms_ease-out]">
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col">
        {/* Progress bar */}
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-8">
          <div
            className="h-full bg-gradient-pink transition-[width] duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold mb-7 leading-tight">
          {title}
        </h2>

        <div className="space-y-3">
          {options.map((label) => (
            <button
              key={label}
              onClick={onSelect}
              className="w-full text-left bg-[hsl(0_0%_8%)] border border-white/10 hover:border-white/30 active:border-[hsl(330_80%_70%)] active:bg-[hsl(0_0%_10%)] transition rounded-2xl px-5 py-4 text-base font-semibold"
            >
              {label}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-neutral-600 mt-auto pt-8 text-center">
          Tap whichever feels right.
        </p>
      </div>
    </main>
  );
}

function Loading() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 bg-[hsl(0_0%_4%)] text-white animate-[fadeIn_300ms_ease-out]">
      <div className="text-center space-y-5">
        <div className="flex items-center justify-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full bg-[hsl(330_80%_70%)] animate-bounce"
            style={{ animationDelay: "0s" }}
          />
          <span
            className="w-2.5 h-2.5 rounded-full bg-[hsl(330_80%_70%)] animate-bounce"
            style={{ animationDelay: "0.15s" }}
          />
          <span
            className="w-2.5 h-2.5 rounded-full bg-[hsl(330_80%_70%)] animate-bounce"
            style={{ animationDelay: "0.3s" }}
          />
        </div>
        <p className="text-2xl font-bold">Matching you with creators…</p>
        <p className="text-sm text-neutral-400">Finding your top picks</p>
      </div>
    </main>
  );
}

function Results() {
  return (
    <main className="min-h-screen px-4 sm:px-6 py-10 bg-[hsl(0_0%_4%)] text-white animate-[fadeIn_400ms_ease-out]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-[11px] uppercase tracking-[0.25em] text-[hsl(330_80%_70%)] font-bold mb-2">
            ✓ matched
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
            Your top picks
          </h1>
          <p className="text-sm text-neutral-400">
            Tap any profile to view their page
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {CREATORS.map((c) => (
            <CreatorCard key={c.slug} creator={c} />
          ))}
        </div>

        <p className="mt-8 text-center text-[11px] text-neutral-600 leading-relaxed max-w-md mx-auto">
          Independent professionals. All featured profiles are 18+ and operate
          under their own platform terms.
        </p>
      </div>
    </main>
  );
}
