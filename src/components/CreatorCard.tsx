"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Creator } from "@/data/creators";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/**
 * Card on the homepage that links to /go?slug=<slug>. Clicking fires Meta
 * Pixel events from this page (where fbevents.js is already loaded) and
 * then navigates — the /go page handles the actual redirect to the
 * destination URL based on the slug.
 */
export default function CreatorCard({ creator }: { creator: Creator }) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (!creator.video || showVideo) return;
    const node = linkRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShowVideo(true);
          obs.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [creator.video, showVideo]);

  function onClick() {
    if (typeof window === "undefined") return;
    const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void })
      .fbq;
    if (!fbq || !PIXEL_ID) return;
    const payload = {
      content_name: creator.name,
      content_ids: [creator.slug],
      currency: "USD",
      value: 30,
    };
    fbq("trackSingle", PIXEL_ID, "Lead", payload);
  }

  return (
    <Link
      ref={linkRef}
      href={`/go?slug=${encodeURIComponent(creator.slug)}`}
      onClick={onClick}
      className="group relative block aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-900 ring-1 ring-white/10 hover:ring-white/25 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_36px_-8px_rgba(0,0,0,0.8)] transition-all"
    >
      {creator.video ? (
        showVideo ? (
          <video
            src={creator.video}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : (
          <div className="absolute inset-0 bg-neutral-900" />
        )
      ) : creator.photo ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.04]"
          style={{ backgroundImage: `url(${creator.photo})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900" />
      )}

      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

      <div className="absolute left-3 bottom-3 right-3">
        <h3 className="text-white text-base sm:text-lg font-bold drop-shadow truncate">
          {creator.name}
        </h3>
        <p className="text-[11px] text-neutral-200/90 mt-0.5 flex items-center gap-1.5 drop-shadow">
          <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#4ade80] opacity-75 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
          </span>
          <span className="truncate">{creator.activity}</span>
        </p>
      </div>
    </Link>
  );
}
