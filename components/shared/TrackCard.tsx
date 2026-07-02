"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDuration, formatNumber } from "@/lib/formatters";
import { usePlayer } from "@/providers/PlayerProvider";
import type { KeyboardEvent } from "react";
import type { Track } from "@/types/domain";

interface TrackCardProps {
  track: Track;
  artistName?: string;
  contextQueue?: string[];
  onSelect?: (track: Track) => void;
}

export function TrackCard({ artistName, contextQueue, onSelect, track }: TrackCardProps) {
  const playerContext = usePlayer();

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(track);
      return;
    }

    if (contextQueue && contextQueue.length > 0) {
      localStorage.setItem("soundwave_active_queue", JSON.stringify(contextQueue));
    } else {
      localStorage.removeItem("soundwave_active_queue");
    }

    playerContext.setPlayerState({
      ...playerContext.playerState,
      currentTrackId: track.id,
      queueTrackIds: contextQueue && contextQueue.length > 0 ? contextQueue : playerContext.playerState.queueTrackIds,
      isPlaying: true
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCardClick();
    }
  };

  return (
    <div className="cursor-pointer" onClick={handleCardClick} onKeyDown={handleKeyDown} role="button" tabIndex={0}>
      <Card className="flex items-center gap-4 transition-colors hover:bg-surface-700/70">
        {track.coverImageUrl ? (
          <img
            alt={`${track.title} cover`}
            className="h-14 w-14 shrink-0 rounded-md object-cover"
            src={track.coverImageUrl}
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-surface-700 text-xs text-slate-400">
            Cover
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-50">{track.title}</p>
          {artistName ? (
            <Link
              className="block truncate text-sm text-slate-400 hover:text-slate-300 hover:underline"
              href={`/artist/${track.artistId}`}
              onClick={(event) => event.stopPropagation()}
            >
              {artistName}
            </Link>
          ) : (
            <p className="truncate text-sm text-slate-400">Unknown artist</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            {formatDuration(track.durationSeconds)} - {formatNumber(track.playCount)} plays
          </p>
        </div>
        {track.explicit ? <Badge tone="warning">Explicit</Badge> : null}
      </Card>
    </div>
  );
}
