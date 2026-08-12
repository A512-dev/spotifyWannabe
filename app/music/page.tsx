"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { AlbumCard, PageHeader, TrackCard } from "@/components/shared";
import { musicApi } from "@/features/music/api";
import { usePlayer, useUserPreferences } from "@/providers";
import type { Album, Track } from "@/types/domain";

type ApiTrack = Track & { artistName?: string };
type ApiAlbum = Album & { artistName?: string };

function MusicContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetPlaylistId = searchParams.get("addToPlaylist");
  const targetTrackId = searchParams.get("track");
  const { setPlayerState } = usePlayer();
  const { t } = useUserPreferences();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [tracks, setTracks] = useState<ApiTrack[]>([]);
  const [albums, setAlbums] = useState<ApiAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      const trackOrdering = sortBy === "oldest" ? "release_date" : sortBy === "most_played" ? "-play_count" : "-release_date";
      const albumOrdering = sortBy === "oldest" ? "release_date" : sortBy === "most_played" ? "-listener_count" : "-release_date";
      void Promise.all([
        musicApi.listTracks({ search: searchQuery, ordering: trackOrdering }),
        musicApi.listAlbums({ search: searchQuery, ordering: albumOrdering })
      ]).then(([trackResponse, albumResponse]) => {
        setTracks(trackResponse.results);
        setAlbums(albumResponse.results);
        setMessage("");
      }).catch((error: Error) => setMessage(error.message)).finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery, sortBy]);

  useEffect(() => {
    if (!targetTrackId || tracks.length === 0) return;
    const target = tracks.find((track) => track.id === targetTrackId);
    if (!target) return;
    const queueTrackIds = tracks.map((track) => track.id);
    localStorage.setItem("soundwave_active_queue", JSON.stringify(queueTrackIds));
    setPlayerState((state) => ({ ...state, currentTrackId: target.id, queueTrackIds, isPlaying: true }));
    // The notification target is consumed once after the catalog is loaded.
    router.replace("/music", { scroll: false });
  }, [router, setPlayerState, targetTrackId, tracks]);

  const handleSelect = async (track: Track) => {
    if (!targetPlaylistId) return;
    try {
      await musicApi.addTrackToPlaylist(targetPlaylistId, track.id);
      router.push("/playlists");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("Could not add this track."));
    }
  };

  return (
    <MainAppLayout>
      <PageHeader
        description={t(targetPlaylistId ? "Choose a track for the selected playlist." : "Search albums and tracks by title or artist.")}
        title={t("Music")}
      />
      <div className="mt-6 flex flex-col gap-4 sm:flex-row">
        <input className="flex-1 rounded-md border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm" onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("Search by title or artist...")} value={searchQuery} />
        <select className="rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm" onChange={(e) => setSortBy(e.target.value)} value={sortBy}>
          <option value="newest">{t("Newest releases")}</option>
          <option value="oldest">{t("Oldest releases")}</option>
          <option value="most_played">{t("Most played tracks")}</option>
        </select>
      </div>
      {message ? <p className="mt-4 text-sm text-red-300">{message}</p> : null}
      {loading ? <p className="mt-6 text-sm text-slate-400">{t("Loading catalog...")}</p> : null}
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold">{t("Albums")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {albums.map((album) => (
            <Link href={`/music/album/${album.id}`} key={album.id}>
              <AlbumCard album={album} artistName={album.artistName ?? t("Unknown artist")} />
            </Link>
          ))}
        </div>
      </section>
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold">{t("Tracks")}</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {tracks.map((track) => (
            <TrackCard artistName={track.artistName ?? "Unknown artist"} key={track.id} onSelect={targetPlaylistId ? handleSelect : undefined} track={track} />
          ))}
        </div>
      </section>
    </MainAppLayout>
  );
}

export default function MusicPage() {
  const { t } = useUserPreferences();
  return <Suspense fallback={<MainAppLayout>{t("Loading music...")}</MainAppLayout>}><MusicContent /></Suspense>;
}
