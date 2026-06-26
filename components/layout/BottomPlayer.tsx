"use client";

import { Button } from "@/components/ui/Button";
import { tracks } from "@/data/tracks";
import { usePlayer } from "@/providers/PlayerProvider";

export function BottomPlayer() {
  const { playerState, togglePlayback } = usePlayer();
  const currentTrack = tracks.find((track) => track.id === playerState.currentTrackId);

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-surface-700 bg-surface-900 px-4 py-3 shadow-player">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-50">
            {currentTrack?.title ?? "No track selected"}
          </p>
          <p className="truncate text-xs text-slate-400">Player UI placeholder for Phase 1</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={togglePlayback} size="sm" variant="secondary">
            {playerState.isPlaying ? "Pause" : "Play"}
          </Button>
          <span className="hidden text-xs text-slate-500 sm:inline">Volume {playerState.volume}%</span>
        </div>
      </div>
    </footer>
  );
}

