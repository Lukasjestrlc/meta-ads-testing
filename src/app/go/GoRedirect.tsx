"use client";

import { useEffect, useState } from "react";
import {
  buildAndroidIntent,
  detectInAppBrowser,
  type InAppDetect,
} from "@/lib/inAppBrowser";

/**
 * Redirect interstitial that tries hard to land the visitor on the destination
 * inside their *native* browser. Conversions drop sharply in social-app
 * webviews (Instagram/Facebook/TikTok), so:
 *
 *   • Android in-app: redirect via `intent://` to force Chrome.
 *   • iOS in-app: Apple offers no programmatic escape — show clear
 *     "Open in Safari" instructions plus a copy-link fallback.
 *   • Everywhere else: standard `location.replace`.
 */
export default function GoRedirect({ dest }: { dest: string }) {
  const [showFallback, setShowFallback] = useState(false);
  const [iosEscape, setIosEscape] = useState<InAppDetect | null>(null);

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

    const detect = detectInAppBrowser();

    if (detect.isInApp && detect.isAndroid) {
      // intent:// forces an external browser to handle the URL.
      window.location.replace(buildAndroidIntent(safe));
      const t = setTimeout(() => setShowFallback(true), 1500);
      return () => clearTimeout(t);
    }

    if (detect.isInApp && detect.isIOS) {
      // No programmatic escape — render the instructions screen.
      setIosEscape(detect);
      return;
    }

    window.location.replace(safe);
    const t = setTimeout(() => setShowFallback(true), 600);
    return () => clearTimeout(t);
  }, [dest]);

  if (iosEscape) {
    return <IOSEscapeScreen dest={dest} detect={iosEscape} />;
  }

  if (!showFallback) {
    return <main className="min-h-dvh bg-[hsl(0_0%_4%)]" />;
  }

  return (
    <main className="min-h-dvh grid place-items-center bg-[hsl(0_0%_4%)] text-white p-4">
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

function IOSEscapeScreen({
  dest,
  detect,
}: {
  dest: string;
  detect: InAppDetect;
}) {
  const [copied, setCopied] = useState(false);

  // Per-app instructions point at the menu the user actually sees.
  const instruction =
    detect.source === "instagram"
      ? "Tap the ⋯ menu in the top right, then \"Open in External Browser\""
      : detect.source === "facebook"
        ? "Tap the ⋯ menu in the bottom right, then \"Open in Safari\""
        : detect.source === "tiktok"
          ? "Tap the share icon, then \"Open in Browser\""
          : "Tap the menu, then \"Open in Safari\"";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(dest);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Some webviews block clipboard access — fall through silently.
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-[hsl(0_0%_4%)] text-white p-6">
      <div className="max-w-sm w-full text-center space-y-7">
        <div className="space-y-3">
          <div className="text-5xl">🌐</div>
          <h1 className="text-2xl font-bold tracking-tight">
            One last step
          </h1>
          <p className="text-sm text-neutral-300 leading-relaxed">
            Open this page in Safari so your chat stays signed in.
          </p>
        </div>

        <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-5 text-left space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[hsl(330_80%_70%)] text-white text-xs font-bold grid place-items-center">
              1
            </span>
            <p className="text-sm text-white/90 leading-relaxed">
              {instruction}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[hsl(330_80%_70%)] text-white text-xs font-bold grid place-items-center">
              2
            </span>
            <p className="text-sm text-white/90 leading-relaxed">
              When the page opens in Safari, tap{" "}
              <span className="font-bold text-[#4ade80]">Continue</span>.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={copyLink}
            className="w-full bg-white/[0.06] border border-white/15 text-white font-semibold py-3 rounded-full text-sm hover:bg-white/[0.1] active:scale-[0.98] transition-all"
          >
            {copied ? "Link copied ✓" : "Copy link"}
          </button>
          <a
            href={dest}
            className="block w-full bg-gradient-pink text-white font-bold py-3 rounded-full text-sm shadow-[0_8px_28px_-4px_rgba(240,117,179,0.6)] active:scale-[0.98] transition-all"
          >
            Continue here →
          </a>
        </div>

        <p className="text-[11px] text-neutral-500 leading-relaxed">
          Some payment and login flows don&apos;t work in in-app browsers,
          so Safari gives you the smoothest experience.
        </p>
      </div>
    </main>
  );
}
