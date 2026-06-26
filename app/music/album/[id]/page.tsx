import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { EmptyState, PageHeader, TrackCard } from "@/components/shared";
import { albums } from "@/data/albums";
import { artists } from "@/data/artists";
import { tracks } from "@/data/tracks";

interface AlbumPageProps {
  params: {
    id: string;
  };
}

export default function AlbumPage({ params }: AlbumPageProps) {
  const album = albums.find((item) => item.id === params.id);
  const albumTracks = tracks.filter((track) => album?.trackIds.includes(track.id));
  const artist = artists.find((item) => item.id === album?.artistId);

  return (
    <MainAppLayout>
      {album ? (
        <>
          <PageHeader
            description="Album detail skeleton for track listing, credits, release metadata, and play controls."
            title={album.title}
          />
          <section className="mt-6 grid gap-3">
            {/* Developer 2 can add queue actions, saved state, and play buttons here. */}
            {albumTracks.map((track) => (
              <TrackCard artistName={artist?.stageName} key={track.id} track={track} />
            ))}
          </section>
        </>
      ) : (
        <EmptyState description="The requested album does not exist in the mock catalog." title="Album not found" />
      )}
    </MainAppLayout>
  );
}

