"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { EmptyState, PageHeader, PlaylistCard, TrackCard } from "@/components/shared";
import { Button, Input, Modal } from "@/components/ui";
import { artists } from "@/data/artists";
import { playlists as defaultPlaylists } from "@/data/playlists";
import { tracks } from "@/data/tracks";
import { readStoredPlaylists, writeStoredPlaylists } from "@/lib/playlist-storage";
import { getPlaylistLimit } from "@/lib/subscription";
import { useAuth } from "@/providers";
import type { Playlist } from "@/types/domain";

function createPlaylistId() {
  // Browser-local ID only needs practical uniqueness within one mock session.
  return `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getArtistName(artistId: string) {
  // Resolve normalized catalog relation for each rendered track.
  return artists.find((artist) => artist.id === artistId)?.stageName ?? "Unknown artist";
}

export default function PlaylistsPage() {
  const { currentUser } = useAuth();
  // One modal serves create and rename modes; these fields describe its state.
  const [localPlaylists, setLocalPlaylists] = useState<Playlist[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Seed only this user's playlists, then prefer any per-user browser edits.
    if (!currentUser) {
      return;
    }

    const userPlaylists = defaultPlaylists.filter((playlist) => playlist.ownerId === currentUser.id);
    setLocalPlaylists(readStoredPlaylists(currentUser.id, userPlaylists));
  }, [currentUser]);

  if (!currentUser) {
    return <MainAppLayout><div className="text-white">Loading playlists...</div></MainAppLayout>;
  }

  // Infinity for Gold works naturally in all numeric comparisons below.
  const playlistLimit = getPlaylistLimit(currentUser.subscriptionTier);

  const savePlaylists = (nextPlaylists: Playlist[]) => {
    // Keep rendered state and browser persistence synchronized through one helper.
    setLocalPlaylists(nextPlaylists);
    writeStoredPlaylists(currentUser.id, nextPlaylists);
  };

  const handleOpenCreate = () => {
    // Enforce the subscription rule before opening an unusable form.
    if (localPlaylists.length >= playlistLimit) {
      setError(`You have reached the maximum number of playlists allowed (${playlistLimit}).`);
      return;
    }

    // Reset any edit-mode residue before presenting a blank creation form.
    setError("");
    setCurrentPlaylistId(null);
    setTitleInput("");
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (playlist: Playlist) => {
    // Prepopulate the shared modal with the selected playlist's identity.
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
      // Recheck at submit time in case state changed while the modal was open.
      if (localPlaylists.length >= playlistLimit) {
        setError(`You have reached the maximum number of playlists allowed (${playlistLimit}).`);
        return;
      }

      const now = new Date().toISOString();
      // New playlists begin private and empty with matching audit timestamps.
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
      // Rename only the selected record and refresh its update timestamp.
      savePlaylists(
        localPlaylists.map((playlist) =>
          playlist.id === currentPlaylistId
            ? { ...playlist, title, updatedAt: new Date().toISOString() }
            : playlist
        )
      );
    }

    setError("");
    setIsModalOpen(false);
  };

  const handleDelete = (playlistId: string) => {
    // Phase 1 deletes immediately; no confirmation dialog is used here.
    savePlaylists(localPlaylists.filter((playlist) => playlist.id !== playlistId));
  };

  return (
    <MainAppLayout>
      <PageHeader
        actions={
          <Button onClick={handleOpenCreate} className="bg-brand-primary hover:bg-brand-secondary text-white font-medium shadow-md transition-all">
            Create playlist
          </Button>
        }
        description="Manage your custom playlists and add your favorite tracks."
        title="Playlists"
      />

      <div className="mt-4 flex flex-wrap gap-2.5 items-center">
        {/* Compact counters expose current usage against the plan allowance. */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.04] border border-white/10 text-white/90 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-secondary animate-pulse"></span>
          Your playlists: <strong className="text-white ml-0.5">{localPlaylists.length}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.04] border border-white/10 text-white/90 shadow-sm">
          Limit: <strong className="text-white ml-0.5">{localPlaylists.length}/{playlistLimit}</strong>
        </span>
      </div>

      {error ? <p className="mt-4 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-lg">{error}</p> : null}

      <section className="mt-8">
        {localPlaylists.length === 0 ? (
          /* Empty state gives the same create action as the page header. */
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-8 shadow-inner">
            <EmptyState
              action={
                <Button onClick={handleOpenCreate} className="bg-brand-primary text-white hover:bg-brand-secondary">
                  Create first playlist
                </Button>
              }
              description="Create your first playlist and add your favorite tracks to it."
              title="No playlists found"
            />
          </div>
        ) : (
          /* Playlist columns flow horizontally and scroll when the row overflows. */
          <div className="flex flex-row gap-6 overflow-x-auto pb-6 scrollbar-thin">
            {localPlaylists.map((playlist) => (
              /* Fixed-width column keeps every playlist summary equally readable. */
              <div key={playlist.id} className="w-[320px] shrink-0 rounded-xl border border-white/5 bg-white/[0.02] p-4 shadow-xl flex flex-col gap-4">
                
                {/* Upper region combines presentational card and management actions. */}
                <div className="flex flex-col gap-3 relative group">
                  <PlaylistCard playlist={playlist} />
                  
                  {/* Add, rename, and delete actions belong to the owning page. */}
                  <div className="flex items-center justify-between gap-1 border-t border-white/5 pt-3">
                    <Link
                      className="inline-flex h-7 items-center justify-center rounded-md bg-white/10 px-2.5 text-[11px] font-bold text-white transition hover:bg-white/20"
                      href={`/music?addToPlaylist=${playlist.id}`}
                    >
                      Add track
                    </Link>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleOpenEdit(playlist)} 
                        className="h-7 px-2 rounded-md text-[11px] font-bold text-white/80 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(playlist.id)} 
                        className="h-7 px-2 rounded-md text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/10 hover:bg-rose-500/20 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lower region resolves ordered item IDs into playable TrackCards. */}
                <div className="border-t border-white/5 pt-3 flex-1 flex flex-col min-h-[150px]">
                  <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/50">Tracks ({playlist.itemIds.length})</h3>
                  {playlist.itemIds.length > 0 ? (
                    <div className="flex flex-col gap-1.5 max-h-[320px] overflow-y-auto pr-1">
                      {playlist.itemIds.map((trackId) => {
                        const track = tracks.find((item) => item.id === trackId);

                        if (!track) {
                          // Ignore stale playlist IDs that no longer exist in catalog.
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
                    <p className="text-xs italic text-white/30 py-4 text-center border border-dashed border-white/5 rounded-lg my-auto">
                      Empty playlist
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* The same controlled form creates a title or renames an existing one. */}
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
            <Button onClick={() => setIsModalOpen(false)} type="button" variant="ghost" className="text-white/60 hover:text-white">
              Cancel
            </Button>
            <Button type="submit" className="bg-brand-primary text-white hover:bg-brand-secondary">
              {modalMode === "create" ? "Create" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </MainAppLayout>
  );
}
