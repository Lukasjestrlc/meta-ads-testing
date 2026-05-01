"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  ADMIN_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  passwordMatches,
  verifySessionToken,
} from "@/lib/adminAuth";
import {
  isStoreConfigured,
  loadCreators,
  saveCreators,
} from "@/lib/creatorStore";
import type { Creator } from "@/data/creators";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "/admin");

  if (!(await passwordMatches(password))) {
    return { error: "Incorrect password." };
  }

  const token = await createSessionToken();
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  // Redirect must come from outside the try/catch — Next throws to redirect.
  redirect(from.startsWith("/admin") ? from : "/admin");
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

async function requireAdmin(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    throw new Error("Not authenticated");
  }
}

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function saveCreatorsAction(
  creators: Creator[]
): Promise<SaveResult> {
  await requireAdmin();

  if (!isStoreConfigured()) {
    return {
      ok: false,
      error:
        "Vercel KV isn't connected. In Vercel → Storage → connect Upstash " +
        "Redis, redeploy, and try again.",
    };
  }

  // Sanity check the payload before writing — KV is the live source for the
  // public site, so a typo here would break it.
  const cleaned = creators.map((c) => normalizeCreator(c));
  const slugs = new Set<string>();
  for (const c of cleaned) {
    if (!c.slug) return { ok: false, error: "Every creator needs a slug." };
    if (!c.name) return { ok: false, error: `${c.slug}: name is required.` };
    if (!c.destUrl)
      return {
        ok: false,
        error: `${c.slug}: destination URL is required.`,
      };
    if (slugs.has(c.slug))
      return {
        ok: false,
        error: `Duplicate slug "${c.slug}". Slugs must be unique.`,
      };
    slugs.add(c.slug);
  }

  try {
    await saveCreators(cleaned);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save.",
    };
  }

  // Bust the cache for pages that consume the store.
  revalidatePath("/");
  revalidatePath("/go");
  revalidatePath("/admin");
  return { ok: true };
}

export async function resetToSeedAction(): Promise<SaveResult> {
  await requireAdmin();
  const { CREATORS } = await import("@/data/creators");
  return saveCreatorsAction(CREATORS);
}

export async function getCreatorsForAdmin(): Promise<Creator[]> {
  await requireAdmin();
  return loadCreators();
}

function normalizeCreator(c: Creator): Creator {
  return {
    slug: c.slug.trim(),
    name: c.name.trim(),
    age: Number.isFinite(c.age) ? Math.max(18, Math.floor(c.age)) : 21,
    city: (c.city ?? "").trim(),
    bio: (c.bio ?? "").trim(),
    match: Number.isFinite(c.match)
      ? Math.max(0, Math.min(100, Math.round(c.match)))
      : 90,
    tags: (c.tags ?? [])
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 8),
    photo: c.photo?.trim() ? c.photo.trim() : null,
    video: c.video?.trim() ? c.video.trim() : null,
    destUrl: c.destUrl.trim(),
    activity: (c.activity ?? "").trim(),
  };
}
