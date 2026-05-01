import type { Creator } from "@/data/creators";

/**
 * Shared scene wrapper used by every funnel screen + the results page.
 *
 * Layers (back-to-front):
 *  1. Black base
 *  2. Photo mosaic of the loaded creators (tiles to 12 cells; repeats if
 *     there are fewer creators). Filtered dim+desaturated so foreground
 *     text stays readable while still feeling like a deck of options.
 *  3. Brand-colored multiply tint
 *  4. Drifting brand blobs for color motion
 *  5. Vignette to darken edges and keep focus center
 *  6. Subtle grain
 *
 * All layers use pointer-events-none so they never intercept taps.
 */
export default function Stage({
  creators,
  children,
}: {
  creators?: Pick<Creator, "photo">[];
  children: React.ReactNode;
}) {
  const photos =
    creators
      ?.map((c) => c.photo)
      .filter((p): p is string => typeof p === "string" && p.length > 0) ?? [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[hsl(0_0%_4%)] text-white">
      {/* Layer 2: photo mosaic */}
      {photos.length > 0 && <PhotoMosaic photos={photos} />}

      {/* Layer 3: brand color tint, multiplied over the photos */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, hsl(330 80% 30% / 0.55) 0%, hsl(355 75% 25% / 0.45) 50%, hsl(20 85% 30% / 0.55) 100%)",
          mixBlendMode: "multiply",
        }}
      />

      {/* Layer 4: drifting brand blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -z-10"
        style={{
          top: "-20%",
          left: "-20%",
          width: "70vmin",
          height: "70vmin",
          background:
            "radial-gradient(circle, hsl(330 80% 60% / 0.45) 0%, transparent 60%)",
          filter: "blur(60px)",
          animation: "drift1 18s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -z-10"
        style={{
          bottom: "-25%",
          right: "-15%",
          width: "65vmin",
          height: "65vmin",
          background:
            "radial-gradient(circle, hsl(280 70% 55% / 0.35) 0%, transparent 60%)",
          filter: "blur(70px)",
          animation: "drift2 22s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -z-10"
        style={{
          top: "30%",
          right: "20%",
          width: "40vmin",
          height: "40vmin",
          background:
            "radial-gradient(circle, hsl(20 90% 60% / 0.25) 0%, transparent 60%)",
          filter: "blur(55px)",
          animation: "drift3 26s ease-in-out infinite",
        }}
      />

      {/* Layer 5: vignette — darken edges, keep focus center */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, hsl(0 0% 0% / 0.55) 95%)",
        }}
      />

      {/* Layer 6: grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      {children}
    </main>
  );
}

/**
 * Tiles creator photos into a 3×4 (mobile) or 4×3 (tablet+) grid that fills
 * the viewport. Repeats photos if there are fewer creators than cells.
 */
function PhotoMosaic({ photos }: { photos: string[] }) {
  const TILES = 12;
  const tiles = Array.from({ length: TILES }, (_, i) => photos[i % photos.length]);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 grid grid-cols-3 grid-rows-4 sm:grid-cols-4 sm:grid-rows-3 overflow-hidden"
    >
      {tiles.map((url, i) => (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={i}
          src={url}
          alt=""
          draggable={false}
          decoding="async"
          loading={i < 6 ? "eager" : "lazy"}
          className="w-full h-full object-cover"
          style={{ filter: "brightness(0.45) saturate(0.9) contrast(1.05)" }}
        />
      ))}
    </div>
  );
}
