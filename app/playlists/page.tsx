"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { EmptyState, PageHeader, PlaylistCard, StatCard, TrackCard } from "@/components/shared";
import { Button, Input, Modal } from "@/components/ui";
import { artists } from "@/data/artists";
import { playlists as defaultPlaylists } from "@/data/playlists";
import { tracks } from "@/data/tracks";
import { readStoredPlaylists, writeStoredPlaylists } from "@/lib/playlist-storage";
import { getPlaylistLimit } from "@/lib/subscription";
import { useAuth } from "@/providers";
import type { Playlist } from "@/types/domain";

function createPlaylistId() {
  return `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getArtistName(artistId: string) {
  return artists.find((artist) => artist.id === artistId)?.stageName ?? "Unknown artist";
}

export default function PlaylistsPage() {
  const { currentUser } = useAuth();
  const [localPlaylists, setLocalPlaylists] = useState<Playlist[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const userPlaylists = defaultPlaylists.filter((playlist) => playlist.ownerId === currentUser.id);
    setLocalPlaylists(readStoredPlaylists(currentUser.id, userPlaylists));
  }, [currentUser]);

  if (!currentUser) {
    return <MainAppLayout>Loading playlists...</MainAppLayout>;
  }

  const playlistLimit = getPlaylistLimit(currentUser.subscriptionTier);

  const savePlaylists = (nextPlaylists: Playlist[]) => {
    setLocalPlaylists(nextPlaylists);
    writeStoredPlaylists(currentUser.id, nextPlaylists);
  };

  const handleOpenCreate = () => {
    if (localPlaylists.length >= playlistLimit) {
      setError(`You have reached the maximum number of playlists allowed (${playlistLimit}).`);
      return;
    }

    setError("");
    setCurrentPlaylistId(null);
    setTitleInput("");
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (playlist: Playlist) => {
    setError("");
    setCurrentPlaylistId(playlist.id);
    setTitleInput(playlist.title);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = titleInput.trim();

    if (!title) {
      setError("Playlist title is required.");
      return;
    }

    if (modalMode === "create") {
      if (localPlaylists.length >= playlistLimit) {
        setError(`You have reached the maximum number of playlists allowed (${playlistLimit}).`);
        return;
      }

      const now = new Date().toISOString();
      const nextPlaylist: Playlist = {
        id: createPlaylistId(),
        ownerId: currentUser.id,
        title,
        description: "New custom playlist.",
        isPublic: false,
        itemIds: [],
        createdAt: now,
        updatedAt: now
      };

      savePlaylists([...localPlaylists, nextPlaylist]);
    } else if (currentPlaylistId) {
      savePlaylists(
        localPlaylists.map((playlist) =>
          playlist.id === currentPlaylistId
            ? {
                ...playlist,
                title,
                updatedAt: new Date().toISOString()
              }
            : playlist
        )
      );
    }

    setError("");
    setIsModalOpen(false);
  };

  const handleDelete = (playlistId: string) => {
    savePlaylists(localPlaylists.filter((playlist) => playlist.id !== playlistId));
  };

  return (
    <MainAppLayout>
      <PageHeader
        actions={
          <Button onClick={handleOpenCreate} variant="primary">
            Create playlist
          </Button>
        }
        description="Manage your custom playlists and add your favorite tracks."
        title="Playlists"
      />

      {error ? <p className="mt-4 text-sm font-medium text-red-300">{error}</p> : null}

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <StatCard label="Your playlists" value={String(localPlaylists.length)} />
        <StatCard label="Playlist limit" value={String(playlistLimit)} />
      </section>

      <section className="mt-8">
        {localPlaylists.length === 0 ? (
          <EmptyState
            action={
              <Button onClick={handleOpenCreate} variant="primary">
                Create first playlist
              </Button>
            }
            description="Create your first playlist and add your favorite tracks to it."
            title="No playlists found"
          />
        ) : (
          <div className="grid gap-6">
            {localPlaylists.map((playlist) => (
              <div key={playlist.id} className="rounded-lg border border-surface-700 bg-surface-800/40 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="w-full md:w-72">
                    <PlaylistCard playlist={playlist} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="inline-flex h-8 items-center justify-center rounded-md bg-surface-700 px-3 text-sm font-medium text-slate-50 transition hover:bg-surface-600"
                      href={`/music?addToPlaylist=${playlist.id}`}
                    >
                      Add track
                    </Link>
                    <Button onClick={() => handleOpenEdit(playlist)} size="sm" variant="secondary">
                      Edit name
                    </Button>
                    <Button onClick={() => handleDelete(playlist.id)} size="sm" variant="danger">
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="mt-5 border-t border-surface-700 pt-4">
                  <h3 className="mb-3 text-sm font-semibold text-slate-300">Tracks in this playlist</h3>
                  {playlist.itemIds.length > 0 ? (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {playlist.itemIds.map((trackId) => {
                        const track = tracks.find((item) => item.id === trackId);

                        if (!track) {
                          return null;
                        }

                        return (
                          <TrackCard
                            artistName={getArtistName(track.artistId)}
                            contextQueue={playlist.itemIds}
                            key={track.id}
                            track={track}
                          />
                        );
                      })}
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
        title={modalMode === "create" ? "Create playlist" : "Edit playlist name"}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            autoFocus
            label="Playlist title"
            name="playlistTitle"
            onChange={(event) => setTitleInput(event.target.value)}
            placeholder="Late night favorites"
            required
            value={titleInput}
          />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsModalOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button type="submit">{modalMode === "create" ? "Create" : "Save"}</Button>
          </div>
        </form>
      </Modal>
    </MainAppLayout>
  );
}
