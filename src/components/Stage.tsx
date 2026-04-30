/**
 * Shared scene wrapper used by every quiz screen + the results page.
 * Layers a multi-color gradient blob background over a dark base, with
 * subtle drift animation so the page feels alive. The background uses
 * pointer-events-none so it never intercepts taps.
 *
 * Usage: wrap each screen's content in <Stage>...</Stage> and render
 * normal flow content inside (no need to set background or min-height).
 */
export default function Stage({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[hsl(0_0%_4%)] text-white">
      {/* Base radial wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% -10%, hsl(330 80% 50% / 0.16) 0%, transparent 55%)," +
            "radial-gradient(ellipse at 100% 100%, hsl(280 70% 50% / 0.14) 0%, transparent 55%)," +
            "radial-gradient(ellipse at 0% 100%, hsl(20 90% 55% / 0.10) 0%, transparent 50%)",
        }}
      />
      {/* Drifting blobs — three layers for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute -z-10"
        style={{
          top: "-20%",
          left: "-20%",
          width: "70vmin",
          height: "70vmin",
          background:
            "radial-gradient(circle, hsl(330 80% 60% / 0.35) 0%, transparent 60%)",
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
            "radial-gradient(circle, hsl(280 70% 55% / 0.28) 0%, transparent 60%)",
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
            "radial-gradient(circle, hsl(20 90% 60% / 0.18) 0%, transparent 60%)",
          filter: "blur(55px)",
          animation: "drift3 26s ease-in-out infinite",
        }}
      />
      {/* Subtle grain on top of the gradient for tactile depth */}
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
