"use client";

import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { PageHeader, PlaylistCard, StatCard } from "@/components/shared";
import { Button } from "@/components/ui";
import { playlists } from "@/data/playlists";
import { getPlaylistLimit } from "@/lib/subscription";
import { useAuth } from "@/providers";

export default function PlaylistsPage() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <MainAppLayout>Loading playlists...</MainAppLayout>;
  }

  const ownedPlaylists = playlists.filter((playlist) => playlist.ownerId === currentUser.id);

  return (
    <MainAppLayout>
      <PageHeader
        actions={<Button>Create playlist</Button>}
        description="Playlist skeleton with subscription-aware limits and reusable playlist cards."
        title="Playlists"
      />
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <StatCard label="Your playlists" value={String(ownedPlaylists.length)} />
        <StatCard label="Playlist limit" value={String(getPlaylistLimit(currentUser.subscriptionTier))} />
      </section>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Developer 2 can add create/edit flows, collaborative playlists, and sorting here. */}
        {ownedPlaylists.map((playlist) => (
          <PlaylistCard key={playlist.id} playlist={playlist} />
        ))}
      </section>
    </MainAppLayout>
  );
}
