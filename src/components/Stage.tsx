import type { Creator } from "@/data/creators";

/**
 * Shared scene wrapper used by every funnel screen + the results page.
 *
 * Layers (back-to-front):
 *  1. Black base
 *  2. Photo mosaic of the loaded creators — each tile slowly Ken-Burns
 *     pans and zooms with a randomized delay so the wall feels alive.
 *  3. Brand-colored multiply tint (lighter than before so faces show)
 *  4. Drifting brand blobs for color motion
 *  5. Vignette to keep the center focused
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
      {photos.length > 0 && <PhotoMosaic photos={photos} />}

      {/* Brand color tint — soft multiply, low opacity so faces dominate. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, hsl(330 80% 50% / 0.22) 0%, hsl(355 75% 50% / 0.18) 50%, hsl(20 85% 50% / 0.22) 100%)",
          mixBlendMode: "multiply",
        }}
      />

      {/* Drifting brand blobs for color motion */}
      <div
        aria-hidden
        className="pointer-events-none absolute -z-10"
        style={{
          top: "-20%",
          left: "-20%",
          width: "70vmin",
          height: "70vmin",
          background:
            "radial-gradient(circle, hsl(330 80% 60% / 0.5) 0%, transparent 60%)",
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
            "radial-gradient(circle, hsl(280 70% 55% / 0.4) 0%, transparent 60%)",
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
            "radial-gradient(circle, hsl(20 90% 60% / 0.3) 0%, transparent 60%)",
          filter: "blur(55px)",
          animation: "drift3 26s ease-in-out infinite",
        }}
      />

      {/* Vignette — generous transparent middle so the photo wall stays
          legible across most of the viewport; gentle dark only at the
          extreme edges to hide grid seams. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, hsl(0 0% 0% / 0.25) 80%, hsl(0 0% 0% / 0.55) 100%)",
        }}
      />

      {/* Grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05] mix-blend-overlay"
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
 * Tiles creator photos into a grid that fills the viewport, with each tile
 * Ken-Burns animating on its own delay so the wall feels alive without any
 * tile being perfectly synced with another.
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
        <div key={i} className="relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            draggable={false}
            decoding="async"
            loading={i < 6 ? "eager" : "lazy"}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              objectPosition: "center 30%", // bias toward faces
              filter: "brightness(0.78) saturate(1.05) contrast(1.05)",
              animation: `kenburns ${22 + (i % 5) * 3}s ease-in-out infinite alternate`,
              // Stagger so tiles never move in sync. Negative delays start
              // each tile mid-animation, so there's no synchronized "kick"
              // when the page first loads.
              animationDelay: `-${(i * 1.7) % 16}s`,
              willChange: "transform",
            }}
          />
        </div>
      ))}
    </div>
  );
}
