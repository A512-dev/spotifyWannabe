"use client";

import { use, useEffect, useMemo, useState } from "react";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { AlbumCard, EmptyState, PageHeader, TrackCard } from "@/components/shared";
import { Badge, Button, Card } from "@/components/ui";
import { artistCatalogApi, musicApi, type ArtistProfileApi } from "@/features/music/api";
import { ApiError } from "@/lib/api";
import { formatNumber } from "@/lib/formatters";
import type { Album, Track } from "@/types/domain";

interface ArtistProfilePageProps { params: Promise<{ id: string }> }

export default function ArtistProfilePage({ params }: ArtistProfilePageProps) {
  const { id } = use(params);
  const [artist, setArtist] = useState<ArtistProfileApi | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([
      artistCatalogApi.getArtistProfile(id),
      musicApi.listTracks({ ordering: "-play_count" }),
      musicApi.listAlbums({ ordering: "-release_date" })
    ]).then(([profile, trackData, albumData]) => {
      if (!active) return;
      setArtist(profile);
      setFollowing(profile.isFollowing);
      setTracks(trackData.results.filter((track) => track.artistId === id));
      setAlbums(albumData.results.filter((album) => album.artistId === id));
    }).catch((requestError) => {
      if (active) setError(requestError instanceof ApiError ? requestError.message : "Artist profile could not be loaded.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const queue = useMemo(() => tracks.map((track) => track.id), [tracks]);

  const toggleFollow = async () => {
    if (!artist) return;
    const result = following ? await artistCatalogApi.unfollowUser(artist.userId) : await artistCatalogApi.followUser(artist.userId);
    setFollowing(result.isFollowing);
    setArtist((value) => value ? { ...value, followerCount: result.followerCount } : value);
  };

  if (loading) return <MainAppLayout><p className="text-sm text-slate-400">Loading artist...</p></MainAppLayout>;
  if (!artist) return <MainAppLayout><EmptyState description={error || "The requested artist does not exist."} title="Artist not found" /></MainAppLayout>;

  return (
    <MainAppLayout>
      <section className="overflow-hidden rounded-lg border border-surface-700 bg-surface-800">
        <div className="h-48 bg-surface-700">{artist.bannerImageUrl ? <img alt={`${artist.stageName} banner`} className="h-full w-full object-cover" src={artist.bannerImageUrl} /> : null}</div>
        <div className="px-6 pb-6">
          <div className="-mt-16 flex flex-col gap-4 sm:flex-row sm:items-end">
            {artist.profileImageUrl ? <img alt={artist.stageName} className="h-32 w-32 rounded-lg border-4 border-surface-800 object-cover shadow-xl" src={artist.profileImageUrl} /> : <div className="flex h-32 w-32 items-center justify-center rounded-lg border-4 border-surface-800 bg-surface-700 text-sm text-slate-400">Artist</div>}
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2"><h1 className="text-4xl font-bold text-slate-50">{artist.stageName}</h1><Badge tone="success">Verified</Badge></div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{artist.bio || "No biography has been added yet."}</p>
            </div>
            <Button onClick={() => void toggleFollow()} variant={following ? "secondary" : "primary"}>{following ? "Following" : "Follow"}</Button>
          </div>
        </div>
      </section>
      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><p className="text-sm text-slate-400">Monthly listeners</p><p className="mt-2 text-2xl font-semibold text-slate-50">{artist.monthlyListeners === null ? "Gold only" : formatNumber(artist.monthlyListeners)}</p></Card>
        <Card><p className="text-sm text-slate-400">Total streams</p><p className="mt-2 text-2xl font-semibold text-slate-50">{artist.totalStreams === null ? "Gold only" : formatNumber(artist.totalStreams)}</p></Card>
        <Card><p className="text-sm text-slate-400">Followers</p><p className="mt-2 text-2xl font-semibold text-slate-50">{formatNumber(artist.followerCount)}</p></Card>
        <Card><p className="text-sm text-slate-400">Genres</p><div className="mt-3 flex flex-wrap gap-2">{artist.genreTags.length ? artist.genreTags.map((genre) => <Badge key={genre}>{genre}</Badge>) : <span className="text-sm text-slate-500">Not specified</span>}</div></Card>
      </section>
      <section className="mt-8"><PageHeader description="Popular and recent tracks from this artist." title="Tracks" /><div className="mt-4 grid gap-3 lg:grid-cols-2">{tracks.map((track) => <TrackCard artistName={artist.stageName} contextQueue={queue} key={track.id} track={track} />)}</div></section>
      <section className="mt-8"><h2 className="mb-4 text-xl font-bold text-slate-50">Albums</h2>{albums.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{albums.map((album) => <AlbumCard album={album} artistName={artist.stageName} key={album.id} />)}</div> : <p className="text-sm text-slate-400">No albums are available yet.</p>}</section>
    </MainAppLayout>
  );
}
