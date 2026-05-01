"use client";

import Script from "next/script";

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

/**
 * Microsoft Clarity tracking. Records anonymized session replays + heatmaps
 * + rage-click / dead-click insights so we can actually see what visitors
 * do on the page (not just funnel-event counts from Meta Pixel).
 *
 * Loads only when NEXT_PUBLIC_CLARITY_ID is set — leaving it blank is a
 * safe no-op. Set up at https://clarity.microsoft.com (free, unlimited).
 */
export default function ClarityScript() {
  if (!CLARITY_ID) return null;
  return (
    <Script
      id="clarity-tracker"
      strategy="afterInteractive"
      // Loader pulled verbatim from Clarity's setup wizard.
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_ID}");
        `,
      }}
    />
  );
}
