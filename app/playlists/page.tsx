// app/playlists/page.tsx
'use client';

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { EmptyState, PageHeader, PlaylistCard, TrackCard } from "@/components/shared";
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

<<<<<<< Updated upstream
  const savePlaylists = (newPlaylists: Playlist[]) => {
    setLocalPlaylists(newPlaylists);
    localStorage.setItem("soundwave_playlists", JSON.stringify(newPlaylists));
=======
    const userPlaylists = defaultPlaylists.filter((playlist) => playlist.ownerId === currentUser.id);
    setLocalPlaylists(readStoredPlaylists(currentUser.id, userPlaylists));
  }, [currentUser]);

  if (!currentUser) {
    return <MainAppLayout><div className="text-white">Loading playlists...</div></MainAppLayout>;
  }

  const playlistLimit = getPlaylistLimit(currentUser.subscriptionTier);

  const savePlaylists = (nextPlaylists: Playlist[]) => {
    setLocalPlaylists(nextPlaylists);
    writeStoredPlaylists(currentUser.id, nextPlaylists);
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) return;
=======
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = titleInput.trim();

    if (!title) {
      setError("Playlist title is required.");
      return;
    }
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
      savePlaylists([...localPlaylists, newPlaylist]);
    } else if (modalMode === "edit" && currentPlaylistId) {
      const updated = localPlaylists.map((p) =>
        p.id === currentPlaylistId 
          ? { ...p, title: titleInput.trim(), updatedAt: new Date().toISOString() } 
          : p
=======

      savePlaylists([...localPlaylists, nextPlaylist]);
    } else if (currentPlaylistId) {
      savePlaylists(
        localPlaylists.map((playlist) =>
          playlist.id === currentPlaylistId
            ? { ...playlist, title, updatedAt: new Date().toISOString() }
            : playlist
        )
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
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
=======
        actions={
          <Button onClick={handleOpenCreate} className="bg-brand-primary hover:bg-brand-secondary text-white font-medium shadow-md transition-all">
            Create playlist
          </Button>
        }
        description="Manage your custom playlists and add your favorite tracks."
        title="Playlists"
      />

      <div className="mt-4 flex flex-wrap gap-2.5 items-center">
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
          /* تغییر معماری: ردیف شدن ستون‌ها از چپ به راست با اسکرول افقی در صورت شلوغ شدن */
          <div className="flex flex-row gap-6 overflow-x-auto pb-6 scrollbar-thin">
            {localPlaylists.map((playlist) => (
              /* ستون مجزا برای هر پلی‌لیست با عرض ثابت دقیقا به اندازه کارت (w-72 یا w-80) */
              <div key={playlist.id} className="w-[320px] shrink-0 rounded-xl border border-white/5 bg-white/[0.02] p-4 shadow-xl flex flex-col gap-4">
                
                {/* بخش کارت بالایی پلی‌لیست */}
                <div className="flex flex-col gap-3 relative group">
                  <PlaylistCard playlist={playlist} />
                  
                  {/* دکمه‌های مدیریتی به صورت کپسول فشرده زیر کارت */}
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

                {/* بخش لیست فشرده آهنگ‌های زیر همان پلی‌لیست */}
                <div className="border-t border-white/5 pt-3 flex-1 flex flex-col min-h-[150px]">
                  <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/50">Tracks ({playlist.itemIds.length})</h3>
                  {playlist.itemIds.length > 0 ? (
                    <div className="flex flex-col gap-1.5 max-h-[320px] overflow-y-auto pr-1">
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
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
          <div className="flex justify-end gap-3">
            <Button onClick={() => setIsModalOpen(false)} type="button" variant="secondary">
              Cancel
            </Button>
            <Button type="submit" variant="primary">
=======
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsModalOpen(false)} type="button" variant="ghost" className="text-white/60 hover:text-white">
              Cancel
            </Button>
            <Button type="submit" className="bg-brand-primary text-white hover:bg-brand-secondary">
>>>>>>> Stashed changes
              {modalMode === "create" ? "Create" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </MainAppLayout>
  );
}