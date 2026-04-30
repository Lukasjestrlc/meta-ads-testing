"use client";

import { useEffect, useState } from "react";

/**
 * Tiny redirect interstitial. The Pixel events for the click already fired
 * on the homepage (where fbevents.js was loaded), so all this page does is
 * jump the user to the destination. We hide the UI for the first 600ms
 * so a normal-speed redirect feels like a direct hop, and only show the
 * fallback "opening…" message if the navigation stalls.
 */
export default function GoRedirect({ dest }: { dest: string }) {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    let safe: string | null = null;
    try {
      const u = new URL(dest);
      if (/(^|\.)fanvue\.com$/i.test(u.hostname)) safe = u.toString();
    } catch {
      /* invalid URL */
    }
    if (!safe) {
      setShowFallback(true);
      return;
    }
    window.location.replace(safe);
    const t = setTimeout(() => setShowFallback(true), 600);
    return () => clearTimeout(t);
  }, [dest]);

  if (!showFallback) {
    return <main className="min-h-screen bg-[hsl(0_0%_4%)]" />;
  }

  return (
    <main className="min-h-screen grid place-items-center bg-[hsl(0_0%_4%)] text-white p-4">
      <div className="text-center space-y-3">
        <p className="text-2xl font-bold">opening…</p>
        <p className="text-xs text-neutral-500">
          If nothing happens,{" "}
          <a href={dest} className="underline text-[#4ade80]">
            tap here
          </a>
          .
        </p>
      </div>
    </main>
  );
}
