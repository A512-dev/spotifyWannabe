"use client";

import Link from "next/link";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { AlbumCard, EmptyState, PageHeader, TrackCard } from "@/components/shared";
import { Badge, Card } from "@/components/ui";
import { albums } from "@/data/albums";
import { artists } from "@/data/artists";
import { tracks } from "@/data/tracks";
import { formatNumber } from "@/lib/formatters";

interface ArtistProfilePageProps {
  params: {
    id: string;
  };
}

export default function ArtistProfilePage({ params }: ArtistProfilePageProps) {
  const artist = artists.find((item) => item.id === params.id);
  const artistTracks = tracks.filter((track) => track.artistId === artist?.id);
  const artistAlbums = albums.filter((album) => album.artistId === artist?.id);
  const queueTrackIds = artistTracks.map((track) => track.id);

  return (
    <MainAppLayout>
      {artist ? (
        <>
          <section className="overflow-hidden rounded-lg border border-surface-700 bg-surface-800">
            <div className="h-48 bg-surface-700">
              {artist.bannerImageUrl ? (
                <img
                  alt={`${artist.stageName} banner`}
                  className="h-full w-full object-cover"
                  src={artist.bannerImageUrl}
                />
              ) : null}
            </div>
            <div className="px-6 pb-6">
              <div className="-mt-16 flex flex-col gap-4 sm:flex-row sm:items-end">
                {artist.profileImageUrl ? (
                  <img
                    alt={artist.stageName}
                    className="h-32 w-32 rounded-lg border-4 border-surface-800 object-cover shadow-xl"
                    src={artist.profileImageUrl}
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-lg border-4 border-surface-800 bg-surface-700 text-sm text-slate-400">
                    Artist
                  </div>
                )}
                <div className="min-w-0 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-4xl font-bold text-slate-50">{artist.stageName}</h1>
                    {artist.approvalStatus === "approved" ? <Badge tone="success">Verified</Badge> : null}
                    {artist.approvalStatus !== "approved" ? <Badge tone="warning">{artist.approvalStatus}</Badge> : null}
                  </div>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{artist.bio}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-3">
            <Card>
              <p className="text-sm text-slate-400">Monthly listeners</p>
              <p className="mt-2 text-2xl font-semibold text-slate-50">{formatNumber(artist.monthlyListeners)}</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-400">Followers</p>
              <p className="mt-2 text-2xl font-semibold text-slate-50">{formatNumber(artist.followerCount)}</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-400">Genres</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {artist.genreTags.map((genre) => (
                  <Badge key={genre}>{genre}</Badge>
                ))}
              </div>
            </Card>
          </section>

          <section className="mt-8">
            <PageHeader
              description="Listen to the most important songs in this artist profile."
              title="Popular tracks"
            />
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {artistTracks.map((track) => (
                <TrackCard
                  artistName={artist.stageName}
                  contextQueue={queueTrackIds}
                  key={track.id}
                  track={track}
                />
              ))}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="mb-4 text-xl font-bold text-slate-50">Albums</h2>
            {artistAlbums.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {artistAlbums.map((album) => (
                  <Link href={`/music/album/${album.id}`} key={album.id}>
                    <AlbumCard album={album} artistName={artist.stageName} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No albums are available for this artist yet.</p>
            )}
          </section>
        </>
      ) : (
        <EmptyState
          description="The requested artist does not exist in the mock catalog."
          title="Artist not found"
        />
      )}
    </MainAppLayout>
  );
}
