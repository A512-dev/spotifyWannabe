import { usePlayer } from "@/providers/PlayerProvider";

// Player feature work can grow this hook without forcing page components to change.
export function usePlayerControls() {
  return usePlayer();
}

