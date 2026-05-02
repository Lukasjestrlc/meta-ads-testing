import { promises as fs } from "fs";
import path from "path";
import { CREATORS as SEED, type Creator } from "@/data/creators";

// Live creator list lives in `data/creators.json` at the repo root, and
// uploaded photos live in `public/creators/<slug>.<ext>`. Both are written
// via the GitHub Contents API — each save is one git commit + one Vercel
// rebuild. Slower than KV (~30–60s instead of seconds) but requires no
// database, no marketplace integration, just a GitHub PAT.
//
// Public side reads the JSON file at request time; if it doesn't exist or
// is empty, falls back to the seed list in `src/data/creators.ts` so the
// page never breaks even before the first admin save.

const REPO_PATH = "data/creators.json"; // path inside the repo (forward-slash)
const LOCAL_PATH = path.join("data", "creators.json");
const PHOTO_DIR = "public/creators";

export function isStoreConfigured(): boolean {
  return !!(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO);
}

async function loadFromFile(): Promise<Creator[] | null> {
  try {
    const filePath = path.join(process.cwd(), LOCAL_PATH);
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? (parsed as Creator[]) : null;
  } catch {
    return null;
  }
}

export async function loadCreators(): Promise<Creator[]> {
  const live = await loadFromFile();
  return live && live.length > 0 ? live : SEED;
}

export async function findCreatorBySlug(
  slug: string
): Promise<Creator | null> {
  const all = await loadCreators();
  return all.find((c) => c.slug === slug) ?? null;
}

/**
 * Fetches the live creator list directly from GitHub instead of the
 * deployment's bundled file. Used by the admin so edits show up the
 * instant a save commits — without waiting for Vercel to finish a 30–60s
 * rebuild. Public-facing routes keep using loadCreators() (deployment-
 * bundled) since visitors don't care about sub-minute freshness and the
 * bundled read is faster.
 *
 * Falls back to the bundled version (and ultimately to the seed) on any
 * GitHub failure so admin never shows a hard error for a transient blip.
 */
export async function loadCreatorsFresh(): Promise<Creator[]> {
  if (!isStoreConfigured()) return loadCreators();
  try {
    const { repo, branch, token } = getGithubConfig();
    const res = await fetch(
      `https://api.github.com/repos/${repo}/contents/${REPO_PATH}?ref=${encodeURIComponent(branch)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "peach-club-admin",
        },
        cache: "no-store",
      }
    );
    if (res.status === 404) return loadCreators();
    if (!res.ok) return loadCreators();
    const data = (await res.json()) as { content?: string };
    if (!data.content) return loadCreators();
    const decoded = Buffer.from(data.content, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    return Array.isArray(parsed) && parsed.length > 0
      ? (parsed as Creator[])
      : loadCreators();
  } catch {
    return loadCreators();
  }
}

// ─── GitHub commit primitives ───

function getGithubConfig() {
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) {
    throw new Error(
      "GitHub commits aren't configured. Set GITHUB_TOKEN and GITHUB_REPO " +
        '("owner/name") in Vercel env vars and redeploy.'
    );
  }
  return { repo, branch, token };
}

async function getRepoFileSha(
  repo: string,
  branch: string,
  token: string,
  filePath: string
): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "peach-club-admin",
      },
      cache: "no-store",
    }
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(
      `GitHub get-contents failed (${res.status}): ${await res.text()}`
    );
  }
  const data = (await res.json()) as { sha?: string };
  return data.sha ?? null;
}

async function commitFile(opts: {
  path: string;
  contentB64: string;
  message: string;
}): Promise<void> {
  const { repo, branch, token } = getGithubConfig();
  const sha = await getRepoFileSha(repo, branch, token, opts.path);

  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${opts.path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "peach-club-admin",
      },
      body: JSON.stringify({
        message: opts.message,
        content: opts.contentB64,
        branch,
        ...(sha ? { sha } : {}),
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `GitHub commit failed (${res.status}). ` +
        `Check that GITHUB_TOKEN has Contents: Write for ${repo}. ${body}`
    );
  }
}

export async function saveCreators(creators: Creator[]): Promise<void> {
  // Pretty-print + trailing newline keeps the committed JSON diff-friendly.
  const content = JSON.stringify(creators, null, 2) + "\n";
  const contentB64 = Buffer.from(content, "utf-8").toString("base64");
  await commitFile({
    path: REPO_PATH,
    contentB64,
    message: `Update creators via admin (${creators.length} ${
      creators.length === 1 ? "creator" : "creators"
    })`,
  });
}

function sanitizeSlug(slug: string): string {
  return (
    slug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "creator"
  );
}

/**
 * Commits a base64-encoded image to public/creators/<slug>.<ext> and
 * returns the absolute-from-root URL the public site should reference.
 * The slug is sanitized (a-z, 0-9, hyphen only); the extension is taken
 * from the supplied filename and validated against an allowlist.
 */
export async function savePhoto(
  slug: string,
  filename: string,
  base64: string
): Promise<string> {
  const safeSlug = sanitizeSlug(slug);
  const rawExt = filename.toLowerCase().split(".").pop() ?? "";
  const allowed = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
  const ext = allowed.has(rawExt) ? rawExt : "jpg";

  const repoFile = `${PHOTO_DIR}/${safeSlug}.${ext}`;
  await commitFile({
    path: repoFile,
    contentB64: base64,
    message: `Upload photo for ${safeSlug}`,
  });

  // Cache-bust so the new photo shows up immediately even if a CDN/browser
  // had the old one. The path itself stays stable so creators.json doesn't
  // need updating just because someone re-uploaded the same slug.
  return `/creators/${safeSlug}.${ext}?v=${Date.now()}`;
}

