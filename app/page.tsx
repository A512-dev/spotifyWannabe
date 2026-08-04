"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { AlbumCard, PageHeader, PlaylistCard, TrackCard } from "@/components/shared";
import { Button } from "@/components/ui";
import { musicApi, type PlaylistPlaybackEntry } from "@/features/music/api";
import { useAuth } from "@/providers";
import type { Album, Track } from "@/types/domain";

export default function HomePage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [trending, setTrending] = useState<Track[]>([]);
  const [latest, setLatest] = useState<Track[]>([]);
  const [earlyAccess, setEarlyAccess] = useState<Track[]>([]);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [recentPlaylists, setRecentPlaylists] = useState<PlaylistPlaybackEntry[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([musicApi.home(), musicApi.listAlbums({ ordering: "-release_date" })])
      .then(([home, albumResponse]) => {
        setTrending(home.trendingTracks.slice(0, 6));
        setLatest(home.latestTracks.slice(0, 6));
        setEarlyAccess(home.earlyAccessTracks.slice(0, 6));
        setRecentTracks(home.recentlyPlayed.map((entry) => entry.track).slice(0, 6));
        setRecentPlaylists(home.recentlyPlayedPlaylists.slice(0, 6));
        setAlbums(albumResponse.results.slice(0, 4));
      })
      .catch((requestError: Error) => setError(requestError.message));
  }, []);

  const trackSection = (title: string, rows: Track[]) => rows.length ? (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold text-white">{title}</h2><Link className="text-sm font-semibold text-white/70 hover:text-white" href="/music">View all</Link></div>
      <div className="grid gap-3 lg:grid-cols-2">{rows.map((track) => <TrackCard artistName={track.artistName ?? "Unknown artist"} key={track.id} track={track} />)}</div>
    </section>
  ) : null;

  return (
    <MainAppLayout>
      <PageHeader description="Your listening history, latest releases, popular tracks, and subscription-based access." title={`Welcome${currentUser?.displayName ? `, ${currentUser.displayName}` : ""}`} />
      {currentUser?.subscriptionTier === "basic" ? <div className="mt-6 flex items-center justify-between rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-6"><div><h3 className="text-lg font-bold text-amber-500">Upgrade your subscription</h3><p className="mt-1 text-sm text-amber-200">Unlock downloads, larger playlist limits, early access, and advanced statistics.</p></div><Button onClick={() => router.push("/settings")}>View plans</Button></div> : null}
      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

      {recentPlaylists.length ? <section className="mt-8"><h2 className="mb-4 text-xl font-bold text-white">Recently played playlists</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{recentPlaylists.map((entry) => <Link href="/playlists" key={entry.playlist.id}><PlaylistCard playlist={entry.playlist} /></Link>)}</div></section> : null}
      {trackSection("Recently played", recentTracks)}
      {currentUser?.subscriptionTier === "gold" ? trackSection("Gold early access", earlyAccess) : null}
      {trackSection("Trending tracks", trending)}
      {trackSection("Latest tracks", latest)}

      <section className="mt-8"><h2 className="mb-4 text-xl font-bold text-white">Latest albums</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{albums.map((album) => <AlbumCard album={album} artistName={album.artistName ?? "Unknown artist"} key={album.id} />)}</div></section>
    </MainAppLayout>
  );
}
