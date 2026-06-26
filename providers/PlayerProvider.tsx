"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { PlayerState } from "@/types/domain";

const DEFAULT_PLAYER_STATE: PlayerState = {
  currentTrackId: "track-neon-rain",
  queueTrackIds: ["track-neon-rain", "track-glass-hearts"],
  isPlaying: false,
  volume: 80,
  repeatMode: "off",
  shuffleEnabled: false
};

interface PlayerContextValue {
  playerState: PlayerState;
  setPlayerState: (state: PlayerState) => void;
  togglePlayback: () => void;
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  // This is UI state only. Real audio playback can be introduced in the music feature area.
  const [playerState, setPlayerState] = useState<PlayerState>(DEFAULT_PLAYER_STATE);

  const value = useMemo(
    () => ({
      playerState,
      setPlayerState,
      togglePlayback: () =>
        setPlayerState((current) => ({
          ...current,
          isPlaying: !current.isPlaying
        }))
    }),
    [playerState]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);

  if (!context) {
    throw new Error("usePlayer must be used inside PlayerProvider.");
  }

  return context;
}

