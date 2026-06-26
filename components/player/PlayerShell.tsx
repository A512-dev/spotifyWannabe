"use client";

import { PlayerControlsPlaceholder } from "@/components/player/PlayerControlsPlaceholder";
import { PlayerTrackSummary } from "@/components/player/PlayerTrackSummary";
import { tracks } from "@/data/tracks";
import { usePlayer } from "@/providers/PlayerProvider";

export function PlayerShell() {
  const { playerState } = usePlayer();
  const currentTrack = tracks.find((track) => track.id === playerState.currentTrackId);

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-surface-700 bg-surface-900 px-4 py-3 shadow-player">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <PlayerTrackSummary track={currentTrack} />
        <PlayerControlsPlaceholder volume={playerState.volume} />
      </div>
    </footer>
  );
}

