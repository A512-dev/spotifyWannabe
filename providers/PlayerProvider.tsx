"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { PlayerState } from "@/types/domain";

// The initial queue makes the global player useful immediately after login.
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
  // Whole-state replacement keeps Phase 1 simple; a reducer can replace it later.
  setPlayerState: (state: PlayerState) => void;
}

// Undefined distinguishes "provider missing" from a valid paused/empty state.
const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  // The provider owns shared intent (track, queue, play flag, volume). PlayerShell
  // owns the actual HTMLAudioElement and synchronizes it to this state.
  const [playerState, setPlayerState] = useState<PlayerState>(DEFAULT_PLAYER_STATE);

  const value = useMemo(
    () => ({
      playerState,
      setPlayerState
    }),
    [playerState]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);

  if (!context) {
    // A clear invariant error is easier to diagnose than reading undefined fields.
    throw new Error("usePlayer must be used inside PlayerProvider.");
  }

  return context;
}
