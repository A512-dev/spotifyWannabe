import Link from "next/link";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { AlbumCard, PageHeader, TrackCard } from "@/components/shared";
import { albums } from "@/data/albums";
import { artists } from "@/data/artists";
import { tracks } from "@/data/tracks";

export default function MusicPage() {
  const lina = artists.find((artist) => artist.id === "artist-lina");

  return (
    <MainAppLayout>
      <PageHeader
        description="Music discovery skeleton for browsing albums, tracks, artists, and future search results."
        title="Music"
      />
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-50">Albums</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Developer 2 can add filtering, search, and infinite loading here. */}
          {albums.map((album) => (
            <Link href={`/music/album/${album.id}`} key={album.id}>
              <AlbumCard album={album} artistName={lina?.stageName} />
            </Link>
          ))}
        </div>
      </section>
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-50">Tracks</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {tracks.map((track) => (
            <TrackCard artistName={lina?.stageName} key={track.id} track={track} />
          ))}
        </div>
      </section>
    </MainAppLayout>
  );
}

