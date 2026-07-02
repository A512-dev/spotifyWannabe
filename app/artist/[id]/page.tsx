"use client";

import { useState } from "react";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { EmptyState, PageHeader, StatCard, TrackCard } from "@/components/shared";
import { Badge, Button, Card } from "@/components/ui";
import { artists } from "@/data/artists";
import { tracks } from "@/data/tracks";
import { formatNumber } from "@/lib/formatters";
import { useAuth } from "@/providers";

interface ArtistPageProps {
  params: {
    id: string;
  };
}

export default function ArtistPage({ params }: ArtistPageProps) {
  const { currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const artist = artists.find((item) => item.id === params.id);
  const artistTracks = tracks.filter((track) => track.artistId === params.id);
  const isOwnArtistProfile = currentUser?.id === artist?.userId;
  const followerCount = artist ? artist.followerCount + (isFollowing ? 1 : 0) : 0;

  return (
    <MainAppLayout>
      {artist ? (
        <>
          <PageHeader
            description="Public artist profile with biography, releases, follows, and monthly listener stats."
            title={artist.stageName}
          />
          <section className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
            <Card className="overflow-hidden p-0">
              {artist.bannerImageUrl ? (
                <img
                  alt={`${artist.stageName} banner`}
                  className="h-44 w-full object-cover"
                  src={artist.bannerImageUrl}
                />
              ) : (
                <div className="h-44 w-full bg-surface-700" />
              )}
              <div className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4">
                    {artist.profileImageUrl ? (
                      <img
                        alt={`${artist.stageName} profile`}
                        className="h-20 w-20 rounded-lg border border-surface-600 object-cover"
                        src={artist.profileImageUrl}
                      />
                    ) : null}
                    <div>
                      <Badge tone={artist.approvalStatus === "approved" ? "success" : "warning"}>
                        {artist.approvalStatus}
                      </Badge>
                      <p className="mt-3 text-sm text-slate-300">{artist.bio}</p>
                    </div>
                  </div>
                  <Button
                    disabled={isOwnArtistProfile}
                    onClick={() => setIsFollowing((value) => !value)}
                    variant={isFollowing ? "secondary" : "primary"}
                  >
                    {isOwnArtistProfile ? "Your profile" : isFollowing ? "Unfollow" : "Follow"}
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {artist.genreTags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
              </div>
            </Card>
            <div className="grid gap-4">
              <StatCard label="Monthly listeners" value={formatNumber(artist.monthlyListeners)} />
              <StatCard label="Followers" value={formatNumber(followerCount)} />
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
