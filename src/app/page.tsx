import CreatorCard from "@/components/CreatorCard";
import HomepagePixel from "@/components/HomepagePixel";
import { CREATORS } from "@/data/creators";

export const revalidate = 60;

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[hsl(0_0%_4%)] text-white">
      <HomepagePixel />

      <header className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-10 sm:pb-12">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1] mb-3 max-w-3xl">
            Meet our small circle of independent professionals
          </h1>
          <p className="text-sm sm:text-lg text-neutral-300 mb-5">
            Hand-picked profiles. Each runs their own platform.
          </p>
        </div>
      </header>

      <main
        id="creators"
        className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 pb-12"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {CREATORS.map((c) => (
            <CreatorCard key={c.slug} creator={c} />
          ))}
        </div>
        <p className="mt-6 text-center text-[11px] text-neutral-600 leading-relaxed">
          Independent professionals. All featured profiles are 18+ and operate
          under their own platform terms.
        </p>
      </main>
    </div>
  );
}
