// Tiny session auth: HMAC-signed cookie containing only an expiry timestamp.
// Single-admin app (you) — no user records, no DB session table. Web Crypto
// only so the same code runs in middleware (Edge), API routes, and server
// actions.

export const ADMIN_COOKIE = "peach_admin";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "ADMIN_SESSION_SECRET env var is missing or too short " +
        "(set it to a random 32+ char string in Vercel)."
    );
  }
  return secret;
}

function getAdminPassword(): string | null {
  return process.env.ADMIN_PASSWORD || null;
}

export function isAdminEnabled(): boolean {
  return !!getAdminPassword() && !!process.env.ADMIN_SESSION_SECRET;
}

// ─── base64url helpers (Edge-safe — no Buffer) ───
function b64urlEncode(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const padded =
    str.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((str.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return b64urlEncode(new Uint8Array(sig));
}

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  // Constant-time string compare. Different-length strings xor to nonzero.
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function passwordMatches(input: string): Promise<boolean> {
  const expected = getAdminPassword();
  if (!expected) return false;
  return timingSafeEqual(input, expected);
}

export async function createSessionToken(): Promise<string> {
  const secret = getSecret();
  const payload = b64urlEncode(
    new TextEncoder().encode(
      JSON.stringify({ exp: Date.now() + SESSION_DURATION_MS })
    )
  );
  const sig = await hmacSign(payload, secret);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<boolean> {
  if (!token) return false;
  try {
    const dot = token.indexOf(".");
    if (dot < 1) return false;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const secret = getSecret();
    const expected = await hmacSign(payload, secret);
    if (!(await timingSafeEqual(sig, expected))) return false;
    const json = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)));
    return typeof json.exp === "number" && json.exp > Date.now();
  } catch {
    return false;
  }
}

export const SESSION_MAX_AGE_SECONDS = SESSION_DURATION_MS / 1000;
