"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatDuration, formatNumber } from "@/lib/formatters";
import { usePlayer } from "@/providers/PlayerProvider";
import type { KeyboardEvent } from "react";
import type { Track } from "@/types/domain";

interface TrackCardProps {
  track: Track;
  artistName?: string;
  /** Queue to install when this track begins playing in a list/album context. */
  contextQueue?: string[];
  /** Optional parent override for selection behavior. */
  onSelect?: (track: Track) => void;
}

export function TrackCard({ artistName, contextQueue, onSelect, track }: TrackCardProps) {
  const playerContext = usePlayer();

  const handleCardClick = () => {
    // A caller-provided selection handler takes complete ownership of the click.
    if (onSelect) {
      onSelect(track);
      return;
    }

    if (contextQueue && contextQueue.length > 0) {
      // PlayerShell reads this key when the selected track changes, preserving
      // the playlist/album context for next and previous actions.
      localStorage.setItem("soundwave_active_queue", JSON.stringify(contextQueue));
    } else {
      // Clear stale context when playing from a context-free catalog card.
      localStorage.removeItem("soundwave_active_queue");
    }

    playerContext.setPlayerState({
      // Preserve volume/repeat fields while selecting and starting this track.
      ...playerContext.playerState,
      currentTrackId: track.id,
      queueTrackIds: contextQueue && contextQueue.length > 0 ? contextQueue : playerContext.playerState.queueTrackIds,
      isPlaying: true
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Reproduce native button activation because the card uses role="button".
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCardClick();
    }
  };

  return (
    <div 
      className="w-full cursor-pointer focus:outline-none" 
      onClick={handleCardClick} 
      onKeyDown={handleKeyDown} 
      role="button" 
      tabIndex={0}
    >
      {/* Focusable outer wrapper provides one click/keyboard target for the row. */}
      <div className="flex w-full items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-all duration-200 hover:bg-white/[0.06] hover:border-brand-secondary/20 hover:shadow-md group">
        
        {/* Fixed-size artwork keeps all track rows aligned. */}
        {track.coverImageUrl ? (
          <img
            alt={`${track.title} cover`}
            className="h-12 w-12 shrink-0 rounded-md object-cover shadow"
            src={track.coverImageUrl}
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-brand-primary/20 text-xs text-white/40">
            Cover
          </div>
        )}

        {/* Flexible center column contains the primary and secondary identity. */}
        <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
          <div className="min-w-0">
            <p className="truncate font-bold text-white group-hover:text-brand-secondary transition-colors text-sm sm:text-base">
              {track.title}
            </p>
            {artistName ? (
              /* Artist navigation must not also start playback. */
              <Link
                className="inline-block truncate text-xs sm:text-sm text-white/70 hover:text-white hover:underline transition-colors mt-0.5"
                href={`/artist/${track.artistId}`}
                onClick={(event) => event.stopPropagation()}
              >
                {artistName}
              </Link>
            ) : (
              <p className="truncate text-xs sm:text-sm text-white/40 mt-0.5">Unknown artist</p>
            )}
          </div>

          {/* Duration and stream metadata stay right-aligned on larger screens. */}
          <div className="flex items-center gap-3 shrink-0 text-xs text-white/40 font-medium sm:text-right">
            <span>{formatDuration(track.durationSeconds)}</span>
            <span className="text-[10px] opacity-40">•</span>
            <span>{formatNumber(track.playCount)} plays</span>
          </div>
        </div>

        {/* Explicit label is omitted entirely for clean tracks. */}
        {track.explicit ? (
          <div className="shrink-0">
            <Badge tone="warning">Explicit</Badge>
          </div>
        ) : null}
      </div>
    </div>
  );
}
