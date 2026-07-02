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
        actions={<Button onClick={handleOpenCreate} variant="primary">Create playlist</Button>}
        description="Manage your custom playlists and add your favorite tracks."
        title="Playlists"
      />
      
      {error && <p className="mt-4 text-sm font-medium text-red-500">{error}</p>}

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <StatCard label="Your playlists" value={String(localPlaylists.length)} />
        <StatCard 
          label="Playlist limit" 
          value={getPlaylistLimit(currentUser.subscriptionTier) === Infinity ? "Unlimited" : String(getPlaylistLimit(currentUser.subscriptionTier))} 
        />
      </section>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Developer 2 can add create/edit flows, collaborative playlists, and sorting here. */}
        {ownedPlaylists.map((playlist) => (
          <PlaylistCard key={playlist.id} playlist={playlist} />
        ))}
      </section>

      <Modal 
        onClose={() => setIsModalOpen(false)} 
        open={isModalOpen} 
        title={modalMode === "create" ? "Create New Playlist" : "Edit Playlist Name"}
      >
        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl bg-surface-900 p-6">
          <Input 
            autoFocus
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="Playlist Title" 
            required
            value={titleInput}
          />
          <div className="flex justify-end gap-3">
            <Button onClick={() => setIsModalOpen(false)} type="button" variant="secondary">
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {modalMode === "create" ? "Create" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </MainAppLayout>
  );
}
