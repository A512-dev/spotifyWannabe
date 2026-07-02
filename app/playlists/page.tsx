// app/playlists/page.tsx
'use client';

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { EmptyState, PageHeader, PlaylistCard, StatCard, TrackCard } from "@/components/shared";
import { Button, Input, Modal } from "@/components/ui";
import { currentUser } from "@/data/current-user";
import { playlists as defaultPlaylists } from "@/data/playlists";
import { tracks } from "@/data/tracks";
import { getPlaylistLimit } from "@/lib/subscription";
import type { Playlist } from "@/types/domain";

export default function PlaylistsPage() {
  const router = useRouter();
  const [localPlaylists, setLocalPlaylists] = useState<Playlist[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("soundwave_playlists");
    if (stored) {
      setLocalPlaylists(JSON.parse(stored));
    } else {
      const userPlaylists = defaultPlaylists.filter((p) => p.ownerId === currentUser.id);
      setLocalPlaylists(userPlaylists);
      localStorage.setItem("soundwave_playlists", JSON.stringify(userPlaylists));
    }
  }, []);

  const savePlaylists = (newPlaylists: Playlist[]) => {
    setLocalPlaylists(newPlaylists);
    localStorage.setItem("soundwave_playlists", JSON.stringify(newPlaylists));
  };

  const handleOpenCreate = () => {
    const limit = getPlaylistLimit(currentUser.subscriptionTier);
    if (localPlaylists.length >= limit) {
      setError(`You have reached the maximum number of playlists allowed (${limit}).`);
      return;
    }
    setError(null);
    setTitleInput("");
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (playlist: Playlist) => {
    setError(null);
    setCurrentPlaylistId(playlist.id);
    setTitleInput(playlist.title);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) return;

    if (modalMode === "create") {
      const limit = getPlaylistLimit(currentUser.subscriptionTier);
      if (localPlaylists.length >= limit) return;

      const newPlaylist: Playlist = {
        id: crypto.randomUUID(),
        ownerId: currentUser.id,
        title: titleInput.trim(),
        isPublic: false,
        itemIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      savePlaylists([...localPlaylists, newPlaylist]);
    } else if (modalMode === "edit" && currentPlaylistId) {
      const updated = localPlaylists.map((p) =>
        p.id === currentPlaylistId 
          ? { ...p, title: titleInput.trim(), updatedAt: new Date().toISOString() } 
          : p
      );
      savePlaylists(updated);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    savePlaylists(localPlaylists.filter((p) => p.id !== id));
  };

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

      <section className="mt-8">
        {localPlaylists.length === 0 ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <EmptyState 
              title="No playlists found"
              description="Create your first playlist and add your favorite tracks to it."
              action={
                <Button onClick={handleOpenCreate} variant="primary">
                  Create First Playlist
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid gap-8">
            {localPlaylists.map((playlist) => (
              <div key={playlist.id} className="rounded-xl border border-surface-700 bg-surface-800/30 p-4">
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="w-full md:w-72">
                    <PlaylistCard playlist={playlist} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => router.push(`/music?addToPlaylist=${playlist.id}`)} variant="secondary" size="sm">
                      Add Track
                    </Button>
                    <Button onClick={() => handleOpenEdit(playlist)} variant="secondary" size="sm">
                      Edit Name
                    </Button>
                    <Button onClick={() => handleDelete(playlist.id)} variant="danger" size="sm">
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="ml-4 border-l-2 border-surface-700 pl-4">
                  <h4 className="mb-4 text-sm font-semibold text-slate-300">Tracks in this playlist</h4>
                  {playlist.itemIds.length > 0 ? (
                    <div className="grid gap-3 lg:grid-cols-2">
                      <Suspense fallback={<div>Loading...</div>}>
                        {playlist.itemIds.map((trackId) => {
                          const track = tracks.find(t => t.id === trackId);
                          if (!track) return null;
                          return <TrackCard key={trackId} track={track} contextQueue={playlist.itemIds} />;
                        })}
                      </Suspense>
                    </div>
                  ) : (
                    <p className="text-sm italic text-slate-500">No tracks added to this playlist yet.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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