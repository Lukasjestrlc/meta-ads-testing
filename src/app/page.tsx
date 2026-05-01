import { headers } from "next/headers";
import HomepagePixel from "@/components/HomepagePixel";
import QuizFunnel from "@/components/QuizFunnel";
import { loadCreators } from "@/lib/creatorStore";

// Always fetch fresh creators so admin edits show up immediately.
export const dynamic = "force-dynamic";

export default async function Home() {
  const creators = await loadCreators();
  const visitorCity = await detectVisitorCity();

  // Proximity hack: when we know the visitor's city, swap each creator's
  // city for it before rendering. Triggers the "she's near me" reaction
  // that lifts swipe-right rate. Falls back to the creator's actual city
  // when geo is unavailable (local dev, VPN, missing header, etc.).
  const localized = visitorCity
    ? creators.map((c) => ({ ...c, city: visitorCity }))
    : creators;

  return (
    <>
      <HomepagePixel />
      <QuizFunnel creators={localized} />
    </>
  );
}

async function detectVisitorCity(): Promise<string | null> {
  const h = await headers();
  // Vercel injects these on every request from its edge network.
  // x-vercel-ip-city is URL-encoded ("San%20Francisco").
  const raw = h.get("x-vercel-ip-city");
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw).trim();
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}
