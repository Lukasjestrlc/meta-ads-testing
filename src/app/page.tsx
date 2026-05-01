import HomepagePixel from "@/components/HomepagePixel";
import QuizFunnel from "@/components/QuizFunnel";
import { loadCreators } from "@/lib/creatorStore";
import { trackEvent } from "@/lib/eventStore";

// Always fetch fresh creators so admin edits show up immediately.
export const dynamic = "force-dynamic";

export default async function Home() {
  const creators = await loadCreators();
  // Fire-and-forget pageview counter for /admin/stats. Doesn't block render.
  void trackEvent("page_view");

  return (
    <>
      <HomepagePixel />
      <QuizFunnel creators={creators} />
    </>
  );
}
