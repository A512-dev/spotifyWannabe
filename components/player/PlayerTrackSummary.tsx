"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { formatNumber } from "@/lib/formatters";
import { useAuth, useUserPreferences } from "@/providers";
import type { Track } from "@/types/domain";

interface PlayerTrackSummaryProps {
  track?: Track;
}

export function PlayerTrackSummary({ track }: PlayerTrackSummaryProps) {
  const { currentUser } = useAuth();
  const { locale, t } = useUserPreferences();
  const titleContainerRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLSpanElement | null>(null);
  const [titleOverflow, setTitleOverflow] = useState(false);
  const [marqueeDistance, setMarqueeDistance] = useState(0);

  useEffect(() => {
    const updateTitleOverflow = () => {
      const container = titleContainerRef.current;
      const title = titleRef.current;
      if (!container || !title) return;
      const distance = Math.max(0, title.scrollWidth - container.clientWidth);
      setTitleOverflow(distance > 0);
      setMarqueeDistance(distance);
    };

    updateTitleOverflow();
    const observer = new ResizeObserver(updateTitleOverflow);
    if (titleContainerRef.current) observer.observe(titleContainerRef.current);
    return () => observer.disconnect();
  }, [track?.title]);
  if (!track) return null;

  return (
    <div className="flex w-full items-center gap-3">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-white/10 bg-brand-primary/40 shadow-lg sm:h-14 sm:w-14">
        {track.coverImageUrl ? <img alt={track.title} className="h-full w-full object-cover" src={track.coverImageUrl} /> : <div className="flex h-full items-center justify-center text-[10px] text-white/50">{t("Cover")}</div>}
      </div>
      <div className="flex min-w-0 flex-col justify-center">
        <div aria-label={track.title} className="overflow-hidden text-sm font-bold text-white" ref={titleContainerRef}>
          <span
            className={titleOverflow ? "inline-block whitespace-nowrap will-change-transform [animation:player-title-marquee_7s_ease-in-out_infinite_alternate]" : "block truncate"}
            ref={titleRef}
            style={titleOverflow ? { "--player-title-marquee-distance": `-${marqueeDistance}px` } as CSSProperties : undefined}
          >
            {track.title}
          </span>
        </div>
        <div className="flex items-center gap-1 truncate text-xs font-medium text-white/80">
          <Link className="hover:text-white hover:underline" href={`/artist/${track.artistId}`} onClick={(event) => event.stopPropagation()}>
            {track.artistName ?? t("Unknown artist")}
          </Link>
          {track.albumId ? <><span className="text-white/40">•</span><Link className="truncate hover:text-white hover:underline" href={`/music/album/${track.albumId}`} onClick={(event) => event.stopPropagation()}>{track.albumTitle ?? t("Album")}</Link></> : null}
        </div>
        {currentUser?.subscriptionTier === "gold" ? <span className="mt-0.5 text-[10px] font-bold text-yellow-400">{t("{streams} streams · {listeners} listeners", { streams: formatNumber(track.playCount ?? 0, locale), listeners: formatNumber(track.uniqueListeners ?? 0, locale) })}</span> : null}
      </div>
    </div>
  );
}
