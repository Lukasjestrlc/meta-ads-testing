// Helpers for detecting Meta/social in-app webviews and escaping to the
// device's native browser. Conversion on Fanvue/OnlyFans drops sharply
// inside in-app browsers (Instagram, Facebook, TikTok) because logged-in
// sessions, cookies, and payment flows often break, so we want to break
// the visitor out of the webview whenever we can.

export type InAppDetect = {
  isInApp: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  source:
    | "instagram"
    | "facebook"
    | "tiktok"
    | "snapchat"
    | "twitter"
    | "linkedin"
    | "pinterest"
    | "wechat"
    | "line"
    | "other-webview"
    | null;
};

export function detectInAppBrowser(): InAppDetect {
  if (typeof navigator === "undefined") {
    return { isInApp: false, isAndroid: false, isIOS: false, source: null };
  }

  const ua = navigator.userAgent || "";

  let source: InAppDetect["source"] = null;
  if (/Instagram/i.test(ua)) source = "instagram";
  else if (/(FBAN|FBAV|FB_IAB|FBIOS|FB4A)/i.test(ua)) source = "facebook";
  else if (/(musical_ly|TikTok|Bytedance|BytedanceWebview)/i.test(ua))
    source = "tiktok";
  else if (/Snapchat/i.test(ua)) source = "snapchat";
  else if (/Twitter/i.test(ua)) source = "twitter";
  else if (/LinkedInApp/i.test(ua)) source = "linkedin";
  else if (/Pinterest/i.test(ua)) source = "pinterest";
  else if (/MicroMessenger/i.test(ua)) source = "wechat";
  else if (/\bLine\//i.test(ua)) source = "line";

  // Heuristic catch-all for other in-app webviews on iOS — Apple's webviews
  // don't include "Safari" in the UA when embedded.
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const looksLikeIOSWebview =
    isIOS && /AppleWebKit/i.test(ua) && !/Safari\//i.test(ua);
  if (!source && looksLikeIOSWebview) source = "other-webview";

  return {
    isInApp: source !== null,
    isAndroid: /Android/i.test(ua),
    isIOS,
    source,
  };
}

/**
 * Builds an Android `intent://` URL that forces the system to open the
 * destination in Chrome (with a fallback to the default browser if Chrome
 * isn't installed). This reliably escapes Instagram/Facebook in-app webviews
 * on Android.
 */
export function buildAndroidIntent(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const scheme = parsed.protocol.replace(":", "");
  const tail = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  const fallback = encodeURIComponent(url);
  return (
    `intent://${parsed.host}${tail}` +
    `#Intent;scheme=${scheme};package=com.android.chrome;` +
    `S.browser_fallback_url=${fallback};end`
  );
}
