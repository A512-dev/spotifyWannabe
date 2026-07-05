'use client';

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
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
<<<<<<< Updated upstream
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
=======
    <div 
      className="w-full cursor-pointer focus:outline-none" 
      onClick={handleCardClick} 
      onKeyDown={handleKeyDown} 
      role="button" 
      tabIndex={0}
    >
      {/* سطر افقی شیشه‌ای با افکت هاور ملایم */}
      <div className="flex w-full items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-all duration-200 hover:bg-white/[0.06] hover:border-brand-secondary/20 hover:shadow-md group">
        
        {/* کاور آهنگ */}
        {track.coverImageUrl ? (
          <img
            alt={`${track.title} cover`}
            className="h-12 w-12 shrink-0 rounded-md object-cover shadow"
            src={track.coverImageUrl}
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-brand-primary/20 text-xs text-white/40">
            Cover
          </div>
        )}

        {/* اطلاعات آهنگ و خواننده */}
        <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
          <div className="min-w-0">
            <p className="truncate font-bold text-white group-hover:text-brand-secondary transition-colors text-sm sm:text-base">
              {track.title}
            </p>
            {artistName ? (
              <Link
                className="inline-block truncate text-xs sm:text-sm text-white/70 hover:text-white hover:underline transition-colors mt-0.5"
                href={`/artist/${track.artistId}`}
                onClick={(event) => event.stopPropagation()}
              >
                {artistName}
              </Link>
            ) : (
              <p className="truncate text-xs sm:text-sm text-white/40 mt-0.5">Unknown artist</p>
            )}
          </div>

          {/* اطلاعات مدت زمان و تعداد پخش در سمت راست سطر */}
          <div className="flex items-center gap-3 shrink-0 text-xs text-white/40 font-medium sm:text-right">
            <span>{formatDuration(track.durationSeconds)}</span>
            <span className="text-[10px] opacity-40">•</span>
            <span>{formatNumber(track.playCount)} plays</span>
          </div>
>>>>>>> Stashed changes
        </div>

        {/* نشان بدج تصنیف برای محتوای رکیک در صورت وجود */}
        {track.explicit ? (
          <div className="shrink-0">
            <Badge tone="warning">Explicit</Badge>
          </div>
        ) : null}
      </div>
    </div>
  );
}