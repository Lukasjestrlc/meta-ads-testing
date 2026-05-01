import { after } from "next/server";
import HomepagePixel from "@/components/HomepagePixel";
import QuizFunnel from "@/components/QuizFunnel";
import { loadCreators } from "@/lib/creatorStore";
import { trackEvent } from "@/lib/eventStore";

// Always fetch fresh creators so admin edits show up immediately.
export const dynamic = "force-dynamic";

export default async function Home() {
  const creators = await loadCreators();

  // Counter increment runs after the response is sent so it doesn't add
  // latency — but unlike `void` fire-and-forget, Vercel's runtime keeps
  // the function alive long enough for `after` work to finish.
  after(() => trackEvent("page_view"));

  return (
    <>
      <HomepagePixel />
      <QuizFunnel creators={creators} />
    </>
  );
}
