'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { AlbumCard, PageHeader, TrackCard } from "@/components/shared";
import { Button } from "@/components/ui";
import { albums } from "@/data/albums";
import { artists } from "@/data/artists";
import { tracks } from "@/data/tracks";
import { useAuth } from "@/providers";

export default function HomePage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  const getArtistName = (artistId: string) => {
    return artists.find((a) => a.id === artistId)?.stageName || "Unknown Artist";
  };

  const recommendedTracks = tracks.slice(0, 4);
  const featuredAlbums = albums.slice(0, 4);

  return (
    <MainAppLayout>
      <PageHeader
        description="Discover new music, check your recent plays, and explore top recommendations."
        title="Home"
      />

      {currentUser?.subscriptionTier === "basic" && (
        <div className="mt-6 flex items-center justify-between rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-6">
          <div>
            <h3 className="text-lg font-bold text-amber-500">Upgrade to Premium</h3>
            <p className="mt-1 text-sm text-amber-200">
              Get unlimited playlists, offline mode, and high-quality audio.
            </p>
          </div>
          <Button onClick={() => router.push("/settings")} variant="primary">
            View Plans
          </Button>
        </div>
      )}

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Recommended Tracks</h2>
          <Link className="text-sm font-semibold text-white/70 hover:text-white transition-colors" href="/music">
            View All
          </Link>
        </div>
        {/* تغییر کلیدی: تبدیل گرید به یک لیست عمودی */}
        <div className="flex flex-col gap-3">
          {recommendedTracks.map((track) => (
            <TrackCard 
              artistName={getArtistName(track.artistId)} 
              key={track.id} 
              track={track} 
            />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold text-white">Featured Albums</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featuredAlbums.map((album) => (
            <Link href={`/music/album/${album.id}`} key={album.id}>
              <AlbumCard 
                album={album} 
                artistName={getArtistName(album.artistId)} 
              />
            </Link>
          ))}
        </div>
      </section>
    </MainAppLayout>
  );
}