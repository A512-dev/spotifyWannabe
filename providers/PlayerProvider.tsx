"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { musicApi } from "@/features/music/api";
import { useAuth } from "@/providers/AuthProvider";
import type { PlayerState, Track } from "@/types/domain";

const DEFAULT_PLAYER_STATE: PlayerState = {
  queueTrackIds: [],
  isPlaying: false,
  volume: 80,
  repeatMode: "off",
  shuffleEnabled: false
};

interface PlayerContextValue {
  playerState: PlayerState;
  setPlayerState: (state: PlayerState) => void;
  tracks: Track[];
  refreshTracks: () => Promise<void>;
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [playerState, setPlayerState] = useState<PlayerState>(DEFAULT_PLAYER_STATE);
  const [tracks, setTracks] = useState<Track[]>([]);

  const refreshTracks = useCallback(async () => {
    if (!currentUser) {
      setTracks([]);
      return;
    }
    const response = await musicApi.listTracks({ ordering: "-release_date" });
    setTracks(response.results);
    setPlayerState((state) => {
      if (state.currentTrackId && response.results.some((track) => track.id === state.currentTrackId)) return state;
      const firstTrackId = response.results[0]?.id;
      return {
        ...state,
        currentTrackId: firstTrackId,
        queueTrackIds: response.results.map((track) => track.id),
        isPlaying: false
      };
    });
  }, [currentUser]);

  useEffect(() => {
    void refreshTracks().catch(() => setTracks([]));
  }, [refreshTracks]);

  const value = useMemo(() => ({ playerState, setPlayerState, tracks, refreshTracks }), [playerState, tracks, refreshTracks]);
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside PlayerProvider.");
  return context;
}
