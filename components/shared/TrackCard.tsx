'use client';

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDuration, formatNumber } from "@/lib/formatters";
import { usePlayer } from "@/providers/PlayerProvider";
import type { Track, Playlist } from "@/types/domain";

interface TrackCardProps {
  track: Track;
  artistName?: string;
  contextQueue?: string[]; // اضافه شدن این خط برای دریافت صف پخش اختصاصی
}

export function TrackCard({ artistName, track, contextQueue }: TrackCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetPlaylistId = searchParams ? searchParams.get("addToPlaylist") : null;
  
  const playerContext = usePlayer();

  const handleCardClick = () => {
    if (targetPlaylistId) {
      const stored = localStorage.getItem("soundwave_playlists");
      if (stored) {
        const playlists: Playlist[] = JSON.parse(stored);
        const updatedPlaylists = playlists.map(p => {
          if (p.id === targetPlaylistId) {
            if (!p.itemIds.includes(track.id)) {
              return {
                ...p,
                itemIds: [...p.itemIds, track.id],
                updatedAt: new Date().toISOString()
              };
            }
          }
          return p;
        });
        localStorage.setItem("soundwave_playlists", JSON.stringify(updatedPlaylists));
      }
      router.push("/playlists");
    } else {
      // اگر صف پخشی به کارت پاس داده شده بود، آن را به عنوان صف فعال ذخیره می‌کنیم
      if (contextQueue && contextQueue.length > 0) {
        localStorage.setItem("soundwave_active_queue", JSON.stringify(contextQueue));
      } else {
        localStorage.removeItem("soundwave_active_queue"); // بازگشت به لیست کل آهنگ‌ها
      }

      if (playerContext?.setPlayerState) {
        playerContext.setPlayerState({
          ...playerContext.playerState,
          currentTrackId: track.id,
          isPlaying: true,
        });
      }
    }
  };

  return (
    <div className="cursor-pointer" onClick={handleCardClick}>
      <Card className="flex items-center gap-4 transition-colors hover:bg-surface-800/50">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-700 text-xs text-slate-400">
          {track.coverImageUrl ? (
            <img alt={track.title} className="h-full w-full object-cover" src={track.coverImageUrl} />
          ) : (
            <span>Cover</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-50">{track.title}</p>
          {artistName ? (
            <Link
              className="truncate text-sm text-slate-400 hover:text-slate-300 hover:underline"
              href={`/artist/${track.artistId}`}
              onClick={(e) => e.stopPropagation()}
            >
              {artistName}
            </Link>
          ) : (
            <p className="truncate text-sm text-slate-400">Unknown artist</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            {formatDuration(track.durationSeconds)} · {formatNumber(track.playCount)} plays
          </p>
        </div>
        {track.explicit ? <Badge tone="warning">Explicit</Badge> : null}
      </Card>
    </div>
  );
}