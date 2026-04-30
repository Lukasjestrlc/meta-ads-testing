"use client";

import { useEffect, useState } from "react";
import { CREATORS } from "@/data/creators";
import CreatorCard from "./CreatorCard";
import Stage from "./Stage";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

type Step =
  | { kind: "intro" }
  | { kind: "question"; index: number }
  | { kind: "loading" }
  | { kind: "results" };

const QUESTIONS: { title: string; subtitle?: string; options: string[] }[] = [
  {
    title: "What style do you usually like?",
    subtitle: "We'll match you with creators in that lane.",
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
    title: "How often do you scroll socials?",
    options: ["All day, hooked", "Few times a day", "Once a day", "Now and then"],
  },
  {
    title: "Favorite type of post?",
    options: ["Photos", "Short videos", "Stories / behind the scenes", "Lives"],
  },
];

const LOADING_STAGES = [
  { label: "Analyzing your style…", duration: 900 },
  { label: "Finding creators that match…", duration: 1100 },
  { label: "Filtering top picks…", duration: 900 },
  { label: "Almost there…", duration: 700 },
];

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

  useEffect(() => {
    if (step.kind !== "loading") return;
    const total = LOADING_STAGES.reduce((sum, s) => sum + s.duration, 0);
    const t = setTimeout(() => setStep({ kind: "results" }), total);
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

  return (
    <Stage>
      {step.kind === "intro" && <Intro onStart={start} />}
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
      {step.kind === "loading" && <Loading />}
      {step.kind === "results" && <Results />}
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
            Take a 60-second quiz. We&apos;ll match you with a short list of
            creators worth following.
          </p>
        </div>

        <button
          onClick={onStart}
          className="w-full bg-gradient-pink text-white font-bold py-4 rounded-full text-base shadow-[0_8px_28px_-4px_rgba(240,117,179,0.6)] hover:shadow-[0_12px_36px_-4px_rgba(240,117,179,0.8)] active:scale-[0.98] transition-all"
        >
          Start the quiz →
        </button>

        <div className="flex items-center justify-center gap-4 text-[11px] text-neutral-400">
          <span className="flex items-center gap-1.5">
            <span className="text-[hsl(330_80%_70%)]">★</span> 4.8 rating
          </span>
          <span className="text-neutral-700">·</span>
          <span>12k matches this week</span>
          <span className="text-neutral-700">·</span>
          <span>60s</span>
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
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 leading-tight">
            {title}
          </h2>
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

function Loading() {
  const [stage, setStage] = useState(0);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    let elapsed = 0;
    let cumulative = 0;
    const stageEnds = LOADING_STAGES.map((s) => (cumulative += s.duration));
    const total = stageEnds[stageEnds.length - 1];

    const interval = setInterval(() => {
      elapsed += 50;
      const pct = Math.min(100, Math.round((elapsed / total) * 100));
      setPercent(pct);
      const newStage = stageEnds.findIndex((end) => elapsed < end);
      if (newStage >= 0 && newStage !== stage) {
        setStage(newStage);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [stage]);

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
              {LOADING_STAGES[stage]?.label ?? "Almost done…"}
            </p>
            <p className="text-sm text-neutral-500">
              This will only take a moment
            </p>
          </div>

          <div className="space-y-2 pt-2 px-1">
            {LOADING_STAGES.map((s, i) => (
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

function Results() {
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
              {CREATORS.length} matches found
            </span>
          </div>
          <div>
            <h1 className="text-[2rem] sm:text-4xl font-extrabold tracking-tight mb-3">
              Your top picks
            </h1>
            <p className="text-sm text-neutral-400 max-w-md mx-auto">
              Based on your answers — these creators line up with your vibe.
              Tap any profile to view their page.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {CREATORS.map((c) => (
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
