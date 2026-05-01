import { Redis } from "@upstash/redis";
import { CREATORS as SEED, type Creator } from "@/data/creators";

// Vercel's Upstash Redis integration injects KV_* env vars; if you connect
// Upstash directly it sets UPSTASH_REDIS_*. Support both so the same code
// works regardless of how the user wired up KV in the Vercel dashboard.
const REDIS_URL =
  process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

const redis: Redis | null =
  REDIS_URL && REDIS_TOKEN
    ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN })
    : null;

const KEY = "creators:v1";

export function isStoreConfigured(): boolean {
  return redis !== null;
}

/**
 * Loads the live creator list from KV. If KV isn't configured (local dev
 * without env vars) or if the key has never been written, falls back to
 * the seed data baked into the repo so the public site keeps working.
 */
export async function loadCreators(): Promise<Creator[]> {
  if (!redis) return SEED;
  try {
    const stored = await redis.get<Creator[]>(KEY);
    if (stored && Array.isArray(stored) && stored.length > 0) return stored;
  } catch {
    // Network blip or misconfigured token — never fail the public page;
    // the seed list is always a usable fallback.
  }
  return SEED;
}

export async function saveCreators(creators: Creator[]): Promise<void> {
  if (!redis) {
    throw new Error(
      "KV not configured. Connect Upstash Redis in the Vercel dashboard " +
        "and pull env vars locally (or set KV_REST_API_URL + KV_REST_API_TOKEN)."
    );
  }
  await redis.set(KEY, creators);
}

export async function findCreatorBySlug(slug: string): Promise<Creator | null> {
  const all = await loadCreators();
  return all.find((c) => c.slug === slug) ?? null;
}
