import HomepagePixel from "@/components/HomepagePixel";
import QuizFunnel from "@/components/QuizFunnel";
import { loadCreators } from "@/lib/creatorStore";

// Always fetch fresh creators so admin edits show up immediately.
export const dynamic = "force-dynamic";

export default async function Home() {
  const creators = await loadCreators();
  return (
    <>
      <HomepagePixel />
      <QuizFunnel creators={creators} />
    </>
  );
}
