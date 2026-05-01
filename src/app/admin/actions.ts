"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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
  savePhoto,
  saveVideo,
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
        "GitHub commits aren't configured. Set GITHUB_TOKEN (PAT with " +
        'Contents: Write) and GITHUB_REPO ("owner/name") in Vercel env ' +
        "vars, then redeploy.",
    };
  }

  // Sanity check the payload before writing — once committed to git, the
  // public site rebuilds against this data, so a typo here would break it.
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

  // The commit triggers a Vercel rebuild that picks up data/creators.json.
  // No need to revalidatePath — the file on disk for the *current*
  // deployment hasn't changed; only the next deployment has the new data.
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

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

// Vercel caps the serverless function body at 4.5MB regardless of plan.
// We accept up to ~4MB base64 (≈3MB raw) so there's room for the JSON
// envelope around the payload. The client compresses photos before upload
// to land well under this; videos have to come in pre-trimmed.
const MAX_PHOTO_BASE64_BYTES = 4 * 1024 * 1024;
const MAX_VIDEO_BASE64_BYTES = 4 * 1024 * 1024;

function notConfigured(): UploadResult {
  return {
    ok: false,
    error:
      "GitHub commits aren't configured. Set GITHUB_TOKEN and GITHUB_REPO " +
      "in Vercel env vars and redeploy.",
  };
}

export async function uploadCreatorPhotoAction(
  slug: string,
  filename: string,
  base64: string
): Promise<UploadResult> {
  await requireAdmin();
  if (!isStoreConfigured()) return notConfigured();

  if (!base64) return { ok: false, error: "No file data received." };
  if (base64.length > MAX_PHOTO_BASE64_BYTES) {
    return {
      ok: false,
      error:
        "Photo too large after compression. Try a smaller image (≤3 MB).",
    };
  }

  try {
    const url = await savePhoto(slug, filename, base64);
    return { ok: true, url };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Upload failed.",
    };
  }
}

export async function uploadCreatorVideoAction(
  slug: string,
  filename: string,
  base64: string
): Promise<UploadResult> {
  await requireAdmin();
  if (!isStoreConfigured()) return notConfigured();

  if (!base64) return { ok: false, error: "No file data received." };
  if (base64.length > MAX_VIDEO_BASE64_BYTES) {
    return {
      ok: false,
      error:
        "Video too large for Vercel's 4.5 MB body limit. Use ≤3 MB clip or a hosted URL.",
    };
  }

  try {
    const url = await saveVideo(slug, filename, base64);
    return { ok: true, url };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Upload failed.",
    };
  }
}

function normalizeCreator(c: Creator): Creator {
  return {
    slug: c.slug.trim(),
    name: c.name.trim(),
    age: Number.isFinite(c.age) ? Math.max(18, Math.floor(c.age)) : 21,
    bio: (c.bio ?? "").trim(),
    photo: c.photo?.trim() ? c.photo.trim() : null,
    video: c.video?.trim() ? c.video.trim() : null,
    destUrl: c.destUrl.trim(),
    activity: (c.activity ?? "").trim(),
  };
}
