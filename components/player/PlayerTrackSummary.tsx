"use client";

import Link from "next/link";
import { albums } from "@/data/albums";
import { artists } from "@/data/artists";
import { currentUser } from "@/data/current-user";
import { formatNumber } from "@/lib/formatters";
import type { Track } from "@/types/domain";

interface PlayerTrackSummaryProps {
  track?: Track;
}

export function PlayerTrackSummary({ track }: PlayerTrackSummaryProps) {
  if (!track) {
    return null;
  }

  const artist = artists.find((a) => a.id === track.artistId);
  const album = albums.find((a) => a.id === track.albumId);
  
  const isGoldUser = currentUser.subscriptionTier === "gold";

  return (
    <div className="flex w-full items-center gap-3">
      {/* هماهنگ‌سازی پس‌زمینه باکس کاور با تم بنفش */}
      <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-md bg-brand-primary/40 shadow-lg border border-white/10">
        {track.coverImageUrl ? (
          <img alt={track.title} className="h-full w-full object-cover" src={track.coverImageUrl} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-white/50">
            Cover
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col justify-center">
        {/* سفید و درخشان کردن نام آهنگ */}
        <span className="truncate text-sm font-bold text-white hover:underline cursor-pointer">
          {track.title}
        </span>
        
        {/* روشن و شفاف کردن متون خواننده و آلبوم برای کنتراست بالاتر */}
        <div className="flex items-center gap-1 truncate text-xs text-white/80 font-medium">
          {artist ? (
            <Link
              className="hover:text-white hover:underline transition-colors"
              href={`/artist/${track.artistId}`}
              onClick={(e) => e.stopPropagation()}
            >
              {artist.stageName}
            </Link>
          ) : (
            <span className="text-white/60">Unknown Artist</span>
          )}
          
          {album && (
            <>
              <span className="text-[10px] text-white/40">•</span>
              <Link
                className="truncate hover:text-white hover:underline transition-colors"
                href={`/music/album/${album.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                {album.title}
              </Link>
            </>
          )}
        </div>
        
        {/* تغییر رنگ استریم به کرمی/هلویی اختصاصی پالت شما */}
        {isGoldUser && (
          <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-yellow-400 drop-shadow-sm">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-7.5c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
            </svg>
            {formatNumber(track.playCount)} streams
          </span>
        )}
      </div>
    </div>
  );
}