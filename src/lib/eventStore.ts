import { Redis } from "@upstash/redis";

// Funnel-step events tracked for the /admin/stats dashboard. Order matches
// the user's path through the funnel — render the dashboard top-to-bottom
// in this order and the rates compose naturally.
export const FUNNEL_EVENTS = [
  "page_view",
  "started_swiping",
  "swipe_complete",
  "wheel_spin",
  "wheel_result",
  "match_continue",
  "prep_continue",
  "fanvue_redirect",
] as const;
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

// Per-creator events: only the steps where a specific creator is identifiable.
export const CREATOR_EVENTS = [
  "wheel_result",
  "match_continue",
  "fanvue_redirect",
] as const;
export type CreatorEvent = (typeof CREATOR_EVENTS)[number];

const REDIS_URL =
  process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

const redis: Redis | null =
  REDIS_URL && REDIS_TOKEN
    ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN })
    : null;

export function isEventStoreConfigured(): boolean {
  return redis !== null;
}

function todayKey(): string {
  // YYYY-MM-DD in UTC. Good enough granularity for daily stats.
  return new Date().toISOString().slice(0, 10);
}

/**
 * Increments three counters per event:
 *   1. all-time total
 *   2. today's daily count
 *   3. (optionally) per-creator total
 *
 * Silently no-ops if KV isn't configured — analytics shouldn't crash the
 * funnel if something's wrong with Redis.
 */
export async function trackEvent(
  event: string,
  slug?: string | null
): Promise<void> {
  if (!redis) return;
  const day = todayKey();
  const ops: Promise<unknown>[] = [
    redis.incr(`event:total:${event}`),
    redis.incr(`event:daily:${event}:${day}`),
  ];
  if (slug) {
    ops.push(redis.incr(`event:creator:${slug}:${event}`));
  }
  try {
    await Promise.all(ops);
  } catch {
    // Network blip — drop the event rather than break the request.
  }
}

export type Stats = {
  totals: Record<FunnelEvent, number>;
  today: Record<FunnelEvent, number>;
  byCreator: Record<string, Record<CreatorEvent, number>>;
};

export async function loadStats(creatorSlugs: string[]): Promise<Stats> {
  const empty: Stats = {
    totals: zero(FUNNEL_EVENTS),
    today: zero(FUNNEL_EVENTS),
    byCreator: {},
  };
  if (!redis) return empty;

  const day = todayKey();
  const totalKeys = FUNNEL_EVENTS.map((e) => `event:total:${e}`);
  const todayKeys = FUNNEL_EVENTS.map((e) => `event:daily:${e}:${day}`);
  const creatorKeys = creatorSlugs.flatMap((slug) =>
    CREATOR_EVENTS.map((e) => `event:creator:${slug}:${e}`)
  );

  const allKeys = [...totalKeys, ...todayKeys, ...creatorKeys];
  if (allKeys.length === 0) return empty;

  let values: (string | number | null)[] = [];
  try {
    values = (await redis.mget<(string | number | null)[]>(...allKeys)) ?? [];
  } catch {
    return empty;
  }

  let i = 0;
  const totals = pluck(FUNNEL_EVENTS, values, i);
  i += FUNNEL_EVENTS.length;
  const today = pluck(FUNNEL_EVENTS, values, i);
  i += FUNNEL_EVENTS.length;
  const byCreator: Record<string, Record<CreatorEvent, number>> = {};
  for (const slug of creatorSlugs) {
    byCreator[slug] = pluck(CREATOR_EVENTS, values, i);
    i += CREATOR_EVENTS.length;
  }
  return { totals, today, byCreator };
}

function zero<K extends string>(keys: readonly K[]): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const k of keys) out[k] = 0;
  return out;
}

function pluck<K extends string>(
  keys: readonly K[],
  values: (string | number | null)[],
  start: number
): Record<K, number> {
  const out = {} as Record<K, number>;
  for (let j = 0; j < keys.length; j++) {
    const v = values[start + j];
    out[keys[j]] = v == null ? 0 : Number(v);
  }
  return out;
}
