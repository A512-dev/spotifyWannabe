import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { EmptyState, PageHeader, StatCard, TrackCard } from "@/components/shared";
import { Badge, Card } from "@/components/ui";
import { artists } from "@/data/artists";
import { tracks } from "@/data/tracks";
import { formatNumber } from "@/lib/formatters";

interface ArtistPageProps {
  params: {
    id: string;
  };
}

export default function ArtistPage({ params }: ArtistPageProps) {
  const artist = artists.find((item) => item.id === params.id);
  const artistTracks = tracks.filter((track) => track.artistId === params.id);

  return (
    <MainAppLayout>
      {artist ? (
        <>
          <PageHeader
            description="Public artist page skeleton for biography, releases, follows, and monthly listener stats."
            title={artist.stageName}
          />
          <section className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
            <Card>
              {/* Developer 2 can add follow/unfollow and public profile media here. */}
              <Badge tone={artist.approvalStatus === "approved" ? "success" : "warning"}>
                {artist.approvalStatus}
              </Badge>
              <p className="mt-4 text-sm text-slate-300">{artist.bio}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {artist.genreTags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            </Card>
            <div className="grid gap-4">
              <StatCard label="Monthly listeners" value={formatNumber(artist.monthlyListeners)} />
              <StatCard label="Followers" value={formatNumber(artist.followerCount)} />
            </div>
          </section>
          <section className="mt-8 grid gap-3 lg:grid-cols-2">
            {artistTracks.map((track) => (
              <TrackCard artistName={artist.stageName} key={track.id} track={track} />
            ))}
          </section>
        </>
      ) : (
        <EmptyState description="The requested artist profile does not exist in the mock data." title="Artist not found" />
      )}
    </MainAppLayout>
  );
}

