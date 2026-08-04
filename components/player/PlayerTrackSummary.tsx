"use client";

import Link from "next/link";
import { formatNumber } from "@/lib/formatters";
import { useAuth } from "@/providers";
import type { Track } from "@/types/domain";

interface PlayerTrackSummaryProps {
  track?: Track;
}

export function PlayerTrackSummary({ track }: PlayerTrackSummaryProps) {
  const { currentUser } = useAuth();
  if (!track) return null;

  return (
    <div className="flex w-full items-center gap-3">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-white/10 bg-brand-primary/40 shadow-lg sm:h-14 sm:w-14">
        {track.coverImageUrl ? <img alt={track.title} className="h-full w-full object-cover" src={track.coverImageUrl} /> : <div className="flex h-full items-center justify-center text-[10px] text-white/50">Cover</div>}
      </div>
      <div className="flex min-w-0 flex-col justify-center">
        <span className="truncate text-sm font-bold text-white">{track.title}</span>
        <div className="flex items-center gap-1 truncate text-xs font-medium text-white/80">
          <Link className="hover:text-white hover:underline" href={`/artist/${track.artistId}`} onClick={(event) => event.stopPropagation()}>
            {track.artistName ?? "Unknown artist"}
          </Link>
          {track.albumId ? <><span className="text-white/40">•</span><Link className="truncate hover:text-white hover:underline" href={`/music/album/${track.albumId}`} onClick={(event) => event.stopPropagation()}>{track.albumTitle ?? "Album"}</Link></> : null}
        </div>
        {currentUser?.subscriptionTier === "gold" ? <span className="mt-0.5 text-[10px] font-bold text-yellow-400">{formatNumber(track.playCount ?? 0)} streams</span> : null}
      </div>
    </div>
  );
}
