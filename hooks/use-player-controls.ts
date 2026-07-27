import { usePlayer } from "@/providers/PlayerProvider";

// Stable feature-facing hook. It currently exposes raw player context and can
// later grow named playback actions without changing imports throughout the app.
export function usePlayerControls() {
  return usePlayer();
}
