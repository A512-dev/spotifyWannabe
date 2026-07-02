"use client";

import Link from "next/link";
import { albums } from "@/data/albums";
import { artists } from "@/data/artists";
import { formatNumber } from "@/lib/formatters";
import { useAuth } from "@/providers";
import type { Track } from "@/types/domain";

interface PlayerTrackSummaryProps {
  track?: Track;
}

export function PlayerTrackSummary({ track }: PlayerTrackSummaryProps) {
  const { currentUser } = useAuth();

  if (!track) {
    return null;
  }

  const artist = artists.find((a) => a.id === track.artistId);
  const album = albums.find((a) => a.id === track.albumId);
  
  const isGoldUser = currentUser?.subscriptionTier === "gold";

  return (
    <div className="flex w-full items-center gap-3">
      <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-md bg-surface-700 shadow-lg">
        {track.coverImageUrl ? (
          <img alt={track.title} className="h-full w-full object-cover" src={track.coverImageUrl} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
            Cover
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col justify-center">
        <span className="truncate text-sm font-semibold text-slate-50 hover:underline cursor-pointer">
          {track.title}
        </span>
        
        <div className="flex items-center gap-1 truncate text-xs text-slate-400">
          {artist ? (
            <Link
              className="hover:text-slate-300 hover:underline"
              href={`/artist/${track.artistId}`}
              onClick={(e) => e.stopPropagation()}
            >
              {artist.stageName}
            </Link>
          ) : (
            <span>Unknown Artist</span>
          )}
          
          {album && (
            <>
              <span className="text-[10px]">•</span>
              <Link
                className="truncate hover:text-slate-300 hover:underline"
                href={`/music/album/${album.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                {album.title}
              </Link>
            </>
          )}
        </div>
        
        {isGoldUser && (
          <span className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-amber-500">
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
