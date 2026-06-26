import { Button } from "@/components/ui/Button";

interface PlayerControlsPlaceholderProps {
  volume: number;
}

export function PlayerControlsPlaceholder({ volume }: PlayerControlsPlaceholderProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Intentionally disabled: real playback controls belong to the future music feature implementation. */}
      <Button disabled size="sm" variant="secondary">
        Play
      </Button>
      <span className="hidden text-xs text-slate-500 sm:inline">Volume {volume}%</span>
    </div>
  );
}

