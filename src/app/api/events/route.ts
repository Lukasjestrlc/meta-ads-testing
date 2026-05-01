import { NextResponse } from "next/server";
import { trackEvent } from "@/lib/eventStore";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * Funnel-event sink for the public site. Called from the browser at every
 * step (swipe-complete, wheel-spin, prep-continue, redirect, etc.) so we
 * can compute rates in /admin/stats without depending on Meta's UI.
 *
 * Open endpoint by design — anyone could hit it and inflate counters,
 * but the cost is "noisy stats" not "compromised funnel" so it's fine for
 * a single-tenant ads test bed. If volume becomes a problem, add a
 * per-IP rate limit.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const { event, slug } = body as { event?: string; slug?: string };
  if (typeof event !== "string" || event.length === 0 || event.length > 64) {
    return NextResponse.json({ error: "bad event" }, { status: 400 });
  }
  // Allowlist: only ASCII word chars + a couple separators. Keeps the key
  // namespace tidy and makes accidental key explosions unlikely.
  if (!/^[a-z0-9_:-]+$/i.test(event)) {
    return NextResponse.json({ error: "bad event" }, { status: 400 });
  }
  const safeSlug =
    typeof slug === "string" && /^[a-z0-9-]{1,64}$/i.test(slug)
      ? slug
      : undefined;

  await trackEvent(event, safeSlug);
  return new NextResponse(null, { status: 204 });
}
