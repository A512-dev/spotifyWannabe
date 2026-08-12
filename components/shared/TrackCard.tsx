"use client";

import Link from "next/link";
import { useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { musicApi, type PlaylistWithItems } from "@/features/music/api";
import { ApiError } from "@/lib/api";
import { formatDuration, formatNumber } from "@/lib/formatters";
import { useAuth, usePlayer, useUserPreferences } from "@/providers";
import type { Track } from "@/types/domain";

interface TrackCardProps {
  track: Track;
  artistName?: string;
  contextQueue?: string[];
  onSelect?: (track: Track) => void;
}

export function TrackCard({ artistName, contextQueue, onSelect, track }: TrackCardProps) {
  const { currentUser } = useAuth();
  const player = usePlayer();
  const { locale, t } = useUserPreferences();
  const [menuOpen, setMenuOpen] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistWithItems[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [menuMessage, setMenuMessage] = useState("");

  const handleCardClick = () => {
    if (onSelect) return onSelect(track);
    if (contextQueue?.length) localStorage.setItem("soundwave_active_queue", JSON.stringify(contextQueue));
    else localStorage.removeItem("soundwave_active_queue");
    player.setPlayerState({
      ...player.playerState,
      currentTrackId: track.id,
      queueTrackIds: contextQueue?.length ? contextQueue : player.playerState.queueTrackIds,
      isPlaying: true,
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCardClick();
    }
  };

  const stop = (event: MouseEvent) => {
    event.stopPropagation();
  };

  const openMenu = async (event: MouseEvent<HTMLButtonElement>) => {
    stop(event);
    const opening = !menuOpen;
    setMenuOpen(opening);
    setMenuMessage("");
    if (!opening || playlists.length > 0) return;
    setLoadingPlaylists(true);
    try {
      const response = await musicApi.listPlaylists();
      setPlaylists(response.results);
    } catch (error) {
      setMenuMessage(error instanceof ApiError ? error.message : t("Playlists could not be loaded."));
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const togglePlaylist = async (playlist: PlaylistWithItems) => {
    const containsTrack = playlist.items?.some((item) => item.track.id === track.id) ?? false;
    setMenuMessage("");
    try {
      if (containsTrack) await musicApi.removeTrackFromPlaylist(playlist.id, track.id);
      else await musicApi.addTrackToPlaylist(playlist.id, track.id);
      const response = await musicApi.listPlaylists();
      setPlaylists(response.results);
    } catch (error) {
      setMenuMessage(error instanceof ApiError ? error.message : t("The playlist could not be updated."));
    }
  };

  const downloadTrack = async () => {
    setMenuMessage("");
    try {
      const { downloadUrl } = await musicApi.download(track.id);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = track.title;
      anchor.rel = "noopener";
      anchor.click();
      setMenuOpen(false);
    } catch (error) {
      setMenuMessage(error instanceof ApiError ? error.message : t("The track could not be downloaded."));
    }
  };

  return (
    <div className="relative min-w-0 w-full cursor-pointer focus:outline-none" onClick={handleCardClick} onKeyDown={handleKeyDown} role="button" tabIndex={0}>
      <div className="group flex min-w-0 w-full items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-all hover:border-brand-secondary/20 hover:bg-white/[0.06] hover:shadow-md">
        {track.coverImageUrl ? <img alt={t("{title} cover", { title: track.title })} className="h-12 w-12 shrink-0 rounded-md object-cover shadow" src={track.coverImageUrl} /> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-brand-primary/20 text-xs text-white/40">{t("Cover")}</div>}
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white transition-colors group-hover:text-brand-secondary sm:text-base">{track.title}</p>
            <div className="flex min-w-0 items-center gap-1.5 text-xs text-white/70 sm:text-sm">
              {artistName ? <Link className="truncate hover:text-white hover:underline" href={`/artist/${track.artistId}`} onClick={stop}>{artistName}</Link> : <span className="text-white/40">{t("Unknown artist")}</span>}
              {track.albumId ? <><span className="text-white/30">•</span><Link className="truncate hover:text-white hover:underline" href={`/music/album/${track.albumId}`} onClick={stop}>{track.albumTitle ?? t("Album")}</Link></> : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs font-medium text-white/40">
            <span>{formatDuration(track.durationSeconds)}</span>
            {typeof track.playCount === "number" ? <span>{t("{count} plays", { count: formatNumber(track.playCount, locale) })}</span> : null}
          </div>
        </div>
        {track.explicit ? <Badge tone="warning">{t("Explicit")}</Badge> : null}
        <button aria-label={t("Manage {title}", { title: track.title })} className="rounded-md px-2 py-1 text-lg text-white/60 hover:bg-white/10 hover:text-white" onClick={(event) => void openMenu(event)} type="button">⋮</button>
      </div>

      {menuOpen ? (
        <div className="absolute bottom-[calc(100%+0.25rem)] right-2 z-50 w-72 cursor-default rounded-xl border border-white/10 bg-[#160926]/98 p-3 shadow-2xl" onClick={stop} role="menu">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/50">{t("Manage playlists")}</p>
          {loadingPlaylists ? <p className="text-sm text-white/60">{t("Loading playlists...")}</p> : null}
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {playlists.map((playlist) => {
              const checked = playlist.items?.some((item) => item.track.id === track.id) ?? false;
              return <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/80 hover:bg-white/10" key={playlist.id}><input checked={checked} onChange={() => void togglePlaylist(playlist)} type="checkbox" />{playlist.title}</label>;
            })}
            {!loadingPlaylists && playlists.length === 0 ? <p className="text-sm text-white/50">{t("Create a playlist first.")}</p> : null}
          </div>
          {currentUser?.subscriptionTier === "silver" || currentUser?.subscriptionTier === "gold" ? <button className="mt-3 w-full rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15" onClick={() => void downloadTrack()} type="button">{t("Download track")}</button> : null}
          {menuMessage ? <p className="mt-2 text-xs text-rose-300">{menuMessage}</p> : null}
          <button className="mt-2 w-full text-xs text-white/50 hover:text-white" onClick={() => setMenuOpen(false)} type="button">{t("Close")}</button>
        </div>
      ) : null}
    </div>
  );
}
