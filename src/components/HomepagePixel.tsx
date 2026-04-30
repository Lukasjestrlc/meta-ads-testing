"use client";

import Script from "next/script";

/**
 * Site Meta Pixel. Loaded only on the homepage so the pixel never fires on
 * the /go redirect interstitial (which would race the navigation away).
 *
 * Pixel ID is read from the `NEXT_PUBLIC_META_PIXEL_ID` env var so you can
 * swap pixels in Vercel's Environment Variables UI without redeploying code.
 */
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export default function HomepagePixel() {
  if (!PIXEL_ID) return null;

  return (
    <Script
      id="meta-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${PIXEL_ID}');
          fbq('track', 'PageView');
        `,
      }}
    />
  );
}
