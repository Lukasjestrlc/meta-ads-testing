"use client";

import Link from "next/link";
import { type Creator, pickActivity } from "@/data/creators";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/**
 * Result-screen creator card. Renders a polished tile with a compatibility
 * percentage chip in the top-right, name over a dark gradient. Click fires
 * Pixel events and navigates to /go which redirects to the destination
 * Fanvue URL.
 */
export default function CreatorCard({ creator }: { creator: Creator }) {
  function onClick() {
    if (typeof window === "undefined") return;
    const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
    if (!fbq || !PIXEL_ID) return;
    const payload = {
      content_name: creator.name,
      content_ids: [creator.slug],
      currency: "USD",
      value: 30,
    };
    fbq("trackSingle", PIXEL_ID, "Lead", payload);
    fbq("trackSingle", PIXEL_ID, "InitiateCheckout", payload);
  }

  return (
    <Link
      href={`/go?slug=${encodeURIComponent(creator.slug)}`}
      onClick={onClick}
      className="group relative block aspect-[3/4] rounded-3xl overflow-hidden bg-neutral-900 ring-1 ring-white/10 hover:ring-white/30 shadow-[0_8px_28px_-8px_rgba(0,0,0,0.7)] hover:shadow-[0_16px_44px_-8px_rgba(240,117,179,0.25)] transition-all duration-300"
    >
      {/* Media */}
      {creator.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={creator.photo}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900" />
      )}

      {/* Top gradient for the match chip */}
      <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/60 to-transparent" />

      {/* Bottom gradient for the name + bio */}
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />

      {/* Match chip — top-right */}
      <div className="absolute top-3 right-3 bg-[hsl(330_80%_70%)] text-white text-[10px] font-extrabold tracking-wide px-2.5 py-1 rounded-full shadow-[0_4px_14px_rgba(240,117,179,0.5)]">
        100% MATCH
      </div>

      {/* Active dot — top-left */}
      <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm border border-white/15 text-white text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1.5">
        <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[#4ade80] opacity-75 animate-ping" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
        </span>
        {pickActivity(creator.activity)}
      </div>

      {/* Bottom info */}
      <div className="absolute left-3.5 bottom-3.5 right-3.5">
        <div className="flex items-baseline gap-1.5 mb-1">
          <h3 className="text-white text-lg sm:text-xl font-extrabold drop-shadow-md tracking-tight">
            {creator.name}
          </h3>
          <span className="text-white/80 text-sm font-medium">
            · {creator.age}
          </span>
          <span
            className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#3b82f6] text-white text-[9px] font-bold flex-shrink-0"
            title="verified"
          >
            ✓
          </span>
        </div>
        <p className="text-[11px] text-white/85 line-clamp-2 leading-snug">
          {creator.bio}
        </p>

        {/* Tap-to-view hint */}
        <div className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-semibold text-[hsl(330_80%_70%)] uppercase tracking-wider">
          View profile <span className="text-base">→</span>
        </div>
      </div>
    </Link>
  );
}
