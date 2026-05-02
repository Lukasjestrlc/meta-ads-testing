import type { Metadata } from "next";
import Link from "next/link";
import { loadCreatorsFresh } from "@/lib/creatorStore";
import {
  CREATOR_EVENTS,
  FUNNEL_EVENTS,
  type CreatorEvent,
  type FunnelEvent,
  type Stats,
  isEventStoreConfigured,
  loadStats,
} from "@/lib/eventStore";
import { logoutAction } from "../actions";

export const metadata: Metadata = {
  title: "Admin · Stats",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// User-facing labels for each funnel step.
const STEP_LABELS: Record<FunnelEvent, string> = {
  page_view: "Page views",
  started_swiping: "Started swiping",
  swipe_complete: "Finished swipe deck",
  wheel_spin: "Spun the wheel",
  wheel_result: "Saw their match",
  match_continue: "Tapped 'Open her chat'",
  prep_continue: "Tapped 'Continue to Fanvue'",
  fanvue_redirect: "Redirected to Fanvue",
};

// Tooltip explaining the rate from the previous step.
const STEP_HINTS: Record<FunnelEvent, string> = {
  page_view: "Total visits to the homepage",
  started_swiping: "Tapped 'Start swiping' on the intro screen",
  swipe_complete: "Got through every card in the swipe deck",
  wheel_spin: "Pressed SPIN on the free-trial wheel (only fires when 2+ likes)",
  wheel_result: "Saw their wheel result and continued",
  match_continue:
    "Tapped 'Open her chat' on the It's-a-Match screen (or skipped wheel and continued)",
  prep_continue:
    "Tapped 'Continue to Fanvue' on the prep screen (handled the signup-anxiety moment)",
  fanvue_redirect: "Sent through to Fanvue/the destination URL",
};

const CREATOR_EVENT_LABELS: Record<CreatorEvent, string> = {
  wheel_result: "Wheel wins",
  match_continue: "Match-screen passes",
  fanvue_redirect: "Redirects to Fanvue",
};

export default async function StatsPage() {
  const creators = await loadCreatorsFresh();
  const stats = await loadStats(creators.map((c) => c.slug));
  const configured = isEventStoreConfigured();

  return (
    <main className="min-h-screen bg-[hsl(0_0%_4%)] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[hsl(0_0%_4%)]/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/85">
              peach club · stats
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-xs text-neutral-400 hover:text-white transition-colors"
            >
              ← Creators
            </Link>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-neutral-400 hover:text-white transition-colors"
            >
              View site →
            </a>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-xs text-neutral-400 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-7 space-y-7">
        {!configured && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200 leading-relaxed">
            <strong className="block font-bold mb-1">
              Event store not configured
            </strong>
            Stats need Vercel KV / Upstash Redis. The env vars{" "}
            <span className="font-mono text-xs">KV_REST_API_URL</span> and{" "}
            <span className="font-mono text-xs">KV_REST_API_TOKEN</span> are
            missing — connect Upstash Redis from{" "}
            <span className="font-mono text-xs">
              Vercel → Storage → Add Database
            </span>{" "}
            and redeploy.
          </div>
        )}

        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Funnel</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Conversion rate at each step. Each row&apos;s percentage is the
            rate from the previous step.
          </p>
        </div>

        <FunnelTable stats={stats} />

        {creators.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-bold">By creator</h2>
            <p className="text-sm text-neutral-400 -mt-2">
              How each creator performs once visitors reach the wheel /
              match / redirect step.
            </p>
            <CreatorTable
              creators={creators.map((c) => ({
                slug: c.slug,
                name: c.name,
                photo: c.photo,
              }))}
              byCreator={stats.byCreator}
            />
          </div>
        )}
      </div>
    </main>
  );
}

function FunnelTable({ stats }: { stats: Stats }) {
  const events = FUNNEL_EVENTS;
  const baseTotal = stats.totals[events[0]] || 0;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 px-4 py-2.5 border-b border-white/10 text-[11px] uppercase tracking-wider font-bold text-white/40">
        <span>Step</span>
        <span className="text-right tabular-nums">Total</span>
        <span className="text-right tabular-nums w-20">Today</span>
        <span className="text-right tabular-nums w-20">Rate</span>
      </div>
      {events.map((evt, i) => {
        const total = stats.totals[evt] ?? 0;
        const today = stats.today[evt] ?? 0;
        const prev = i === 0 ? 0 : (stats.totals[events[i - 1]] ?? 0);
        const stepRate = prev > 0 ? (total / prev) * 100 : null;
        const overall =
          baseTotal > 0 && i > 0 ? (total / baseTotal) * 100 : null;
        return (
          <div
            key={evt}
            className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 px-4 py-3 border-b border-white/5 last:border-b-0"
          >
            <div className="min-w-0">
              <div className="text-sm font-bold flex items-center gap-2">
                <span className="text-white/30 tabular-nums text-xs w-4">
                  {i + 1}
                </span>
                {STEP_LABELS[evt]}
              </div>
              <div className="text-[11px] text-neutral-500 truncate pl-6">
                {STEP_HINTS[evt]}
              </div>
            </div>
            <div className="text-right tabular-nums text-sm font-bold">
              {total.toLocaleString()}
            </div>
            <div className="text-right tabular-nums text-sm text-neutral-400 w-20">
              {today.toLocaleString()}
            </div>
            <div className="text-right tabular-nums text-xs w-20">
              {stepRate === null ? (
                <span className="text-white/30">—</span>
              ) : (
                <span
                  className={
                    stepRate >= 50
                      ? "text-[#4ade80] font-bold"
                      : stepRate >= 20
                        ? "text-amber-400 font-bold"
                        : "text-red-400 font-bold"
                  }
                >
                  {stepRate.toFixed(1)}%
                </span>
              )}
              {overall !== null && (
                <div className="text-[10px] text-white/40 mt-0.5">
                  {overall.toFixed(1)}% of all
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CreatorTable({
  creators,
  byCreator,
}: {
  creators: { slug: string; name: string; photo: string | null }[];
  byCreator: Stats["byCreator"];
}) {
  // Sort by Fanvue redirects desc — that's the bottom-of-funnel metric.
  const sorted = [...creators].sort((a, b) => {
    const ra = byCreator[a.slug]?.fanvue_redirect ?? 0;
    const rb = byCreator[b.slug]?.fanvue_redirect ?? 0;
    return rb - ra;
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-2.5 border-b border-white/10 text-[11px] uppercase tracking-wider font-bold text-white/40">
        <span>Creator</span>
        {CREATOR_EVENTS.map((e) => (
          <span key={e} className="text-right tabular-nums w-24">
            {CREATOR_EVENT_LABELS[e]}
          </span>
        ))}
      </div>
      {sorted.map((c) => {
        const counts = byCreator[c.slug] ?? {
          wheel_result: 0,
          match_continue: 0,
          fanvue_redirect: 0,
        };
        return (
          <div
            key={c.slug}
            className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-3 border-b border-white/5 last:border-b-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/[0.04] border border-white/10 flex-shrink-0">
                {c.photo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={c.photo}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>
              <span className="text-sm font-bold truncate">{c.name}</span>
            </div>
            {CREATOR_EVENTS.map((e) => (
              <span
                key={e}
                className="text-right tabular-nums text-sm font-bold w-24"
              >
                {(counts[e] ?? 0).toLocaleString()}
              </span>
            ))}
          </div>
        );
      })}
      {sorted.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-neutral-500">
          No creators yet.
        </div>
      )}
    </div>
  );
}
