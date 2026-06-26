import type { Track } from "@/types/domain";

interface PlayerTrackSummaryProps {
  track?: Track;
}

export function PlayerTrackSummary({ track }: PlayerTrackSummaryProps) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-slate-50">
        {track?.title ?? "No track selected"}
      </p>
      <p className="truncate text-xs text-slate-400">
        Player UI placeholder for Phase 1
      </p>
    </div>
  );
}

