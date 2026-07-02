import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDuration, formatNumber } from "@/lib/formatters";
import type { Track } from "@/types/domain";

interface TrackCardProps {
  track: Track;
  artistName?: string;
}

export function TrackCard({ artistName, track }: TrackCardProps) {
  return (
    <Card className="flex items-center gap-4">
      {track.coverImageUrl ? (
        <img
          alt={`${track.title} cover`}
          className="h-14 w-14 shrink-0 rounded-md object-cover"
          src={track.coverImageUrl}
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-surface-700 text-xs text-slate-400">
          Cover
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-50">{track.title}</p>
        <p className="truncate text-sm text-slate-400">{artistName ?? "Unknown artist"}</p>
        <p className="mt-1 text-xs text-slate-500">
          {formatDuration(track.durationSeconds)} - {formatNumber(track.playCount)} plays
        </p>
      </div>
      {track.explicit ? <Badge tone="warning">Explicit</Badge> : null}
    </Card>
  );
}
