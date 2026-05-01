import { promises as fs } from "fs";
import path from "path";
import { CREATORS as SEED, type Creator } from "@/data/creators";

// Live creator list lives in `data/creators.json` at the repo root. The
// admin's "Save" action writes to this file via the GitHub Contents API,
// which triggers a Vercel rebuild — i.e. each admin save is one git
// commit + one redeploy. Slower than KV (~30–60s instead of seconds) but
// requires no database, no marketplace integration, just a GitHub PAT.
//
// Public side reads the JSON file at request time; if the file doesn't
// exist or is empty, falls back to the seed list in `src/data/creators.ts`
// so the page never breaks even before the first admin save.

const REPO_PATH = "data/creators.json"; // path inside the repo (forward-slash)
const LOCAL_PATH = path.join("data", "creators.json");

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

async function getRepoFileSha(
  repo: string,
  branch: string,
  token: string
): Promise<string | null> {
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
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(
      `GitHub get-contents failed (${res.status}): ${await res.text()}`
    );
  }
  const data = (await res.json()) as { sha?: string };
  return data.sha ?? null;
}

export async function saveCreators(creators: Creator[]): Promise<void> {
  const repo = process.env.GITHUB_REPO; // "owner/name"
  const branch = process.env.GITHUB_BRANCH || "main";
  const token = process.env.GITHUB_TOKEN;

  if (!repo || !token) {
    throw new Error(
      "GitHub commits aren't configured. Set GITHUB_TOKEN and GITHUB_REPO " +
        '("owner/name") in Vercel env vars and redeploy.'
    );
  }

  // Pretty-print + trailing newline keeps the committed JSON diff-friendly.
  const content = JSON.stringify(creators, null, 2) + "\n";
  const contentB64 = Buffer.from(content, "utf-8").toString("base64");
  const sha = await getRepoFileSha(repo, branch, token);

  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${REPO_PATH}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "peach-club-admin",
      },
      body: JSON.stringify({
        message: `Update creators via admin (${creators.length} ${creators.length === 1 ? "creator" : "creators"})`,
        content: contentB64,
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
