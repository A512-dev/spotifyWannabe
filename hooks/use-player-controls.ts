import { usePlayer } from "@/providers/PlayerProvider";

// Player feature work can grow this hook later. For Phase 1 it exposes shell state only.
export function usePlayerControls() {
  return usePlayer();
}
