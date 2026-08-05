"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { EmptyState, PageHeader, PlaylistCard, TrackCard } from "@/components/shared";
import { Button, Checkbox, Input, Modal, Textarea } from "@/components/ui";
import { musicApi, type PlaylistWithItems } from "@/features/music/api";
import { getPlaylistLimit } from "@/lib/subscription";
import { useAuth, usePlayer } from "@/providers";

export default function PlaylistsPage() {
  const { currentUser } = useAuth();
  const { playerState, setPlayerState } = usePlayer();
  const [playlists, setPlaylists] = useState<PlaylistWithItems[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<PlaylistWithItems | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [isPublicInput, setIsPublicInput] = useState(false);
  const [coverInput, setCoverInput] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await musicApi.listPlaylists();
      setPlaylists(response.results);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load playlists.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (currentUser) void load(); }, [currentUser]);

  const playlistLimit = currentUser ? getPlaylistLimit(currentUser.subscriptionTier) : 0;
  const limitLabel = Number.isFinite(playlistLimit) ? String(playlistLimit) : "Unlimited";

  const openCreate = () => {
    setEditing(null);
    setTitleInput("");
    setDescriptionInput("");
    setIsPublicInput(false);
    setCoverInput(null);
    setIsModalOpen(true);
  };

  const openEdit = (playlist: PlaylistWithItems) => {
    setEditing(playlist);
    setTitleInput(playlist.title);
    setDescriptionInput(playlist.description ?? "");
    setIsPublicInput(playlist.isPublic);
    setCoverInput(null);
    setIsModalOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = titleInput.trim();
    if (!title) return;
    try {
      const data = new FormData();
      data.set("title", title);
      data.set("description", descriptionInput.trim());
      data.set("isPublic", String(isPublicInput));
      if (coverInput) data.set("coverImage", coverInput);
      await musicApi.savePlaylist(data, editing?.id);
      setIsModalOpen(false);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save playlist.");
    }
  };

  const removePlaylist = async (id: string) => {
    try {
      await musicApi.deletePlaylist(id);
      setPlaylists((items) => items.filter((item) => item.id !== id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not delete playlist.");
    }
  };

  const removeTrack = async (playlistId: string, trackId: string) => {
    try {
      await musicApi.removeTrackFromPlaylist(playlistId, trackId);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not remove track.");
    }
  };

  const playPlaylist = async (playlist: PlaylistWithItems) => {
    const trackIds = playlist.items?.map((item) => item.track.id) ?? [];
    if (!trackIds.length) return;
    try {
      await musicApi.markPlaylistPlayed(playlist.id);
      localStorage.setItem("soundwave_active_queue", JSON.stringify(trackIds));
      setPlayerState({ ...playerState, currentTrackId: trackIds[0], queueTrackIds: trackIds, isPlaying: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not play playlist.");
    }
  };

  if (!currentUser) return <MainAppLayout>Loading playlists...</MainAppLayout>;

  return (
    <MainAppLayout>
      <PageHeader actions={<Button onClick={openCreate}>Create playlist</Button>} description="Create, rename, delete, and populate your playlists." title="Playlists" />
      <div className="mt-4 flex gap-3 text-xs text-slate-300">
        <span>Your playlists: {playlists.length}</span><span>Limit: {limitLabel}</span>
      </div>
      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      {loading ? <p className="mt-6 text-sm text-slate-400">Loading playlists...</p> : null}
      {!loading && playlists.length === 0 ? (
        <div className="mt-8"><EmptyState action={<Button onClick={openCreate}>Create first playlist</Button>} description="Create your first playlist and add tracks from the music catalog." title="No playlists" /></div>
      ) : (
        <section className="mt-8 flex gap-6 overflow-x-auto pb-6">
          {playlists.map((playlist) => {
            const tracks = playlist.items?.map((item) => item.track) ?? [];
            const queue = tracks.map((track) => track.id);
            return (
              <div className="w-[340px] shrink-0 rounded-xl border border-white/5 bg-white/[0.02] p-4" key={playlist.id}>
                <PlaylistCard playlist={playlist} />
                <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-white/5 pt-3">
                  <Button disabled={!tracks.length} onClick={() => void playPlaylist(playlist)} size="sm">Play</Button>
                  <Link className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-bold" href={`/music?addToPlaylist=${playlist.id}`}>Add track</Link>
                  <div className="flex gap-2">
                    <Button onClick={() => openEdit(playlist)} size="sm" variant="secondary">Edit</Button>
                    <Button onClick={() => void removePlaylist(playlist.id)} size="sm" variant="danger">Delete</Button>
                  </div>
                </div>
                <div className="mt-4 grid gap-2">
                  {tracks.length ? tracks.map((track) => (
                    <div key={track.id}>
                      <TrackCard artistName={track.artistName} contextQueue={queue} track={track} />
                      <button className="mt-1 text-xs text-red-300" onClick={() => void removeTrack(playlist.id, track.id)} type="button">Remove</button>
                    </div>
                  )) : <p className="py-6 text-center text-xs text-slate-500">Empty playlist</p>}
                </div>
              </div>
            );
          })}
        </section>
      )}
      <Modal onClose={() => setIsModalOpen(false)} open={isModalOpen} title={editing ? "Edit playlist" : "Create playlist"}>
        <form className="space-y-4" onSubmit={submit}>
          <Input autoFocus label="Playlist title" name="playlistTitle" onChange={(e) => setTitleInput(e.target.value)} required value={titleInput} />
          <Textarea label="Description" onChange={(event) => setDescriptionInput(event.target.value)} rows={3} value={descriptionInput} />
          <Input accept="image/*" label="Cover image" onChange={(event) => setCoverInput(event.target.files?.[0] ?? null)} type="file" />
          <Checkbox checked={isPublicInput} label="Public playlist" onChange={(event) => setIsPublicInput(event.target.checked)} />
          <div className="flex justify-end gap-2"><Button onClick={() => setIsModalOpen(false)} type="button" variant="ghost">Cancel</Button><Button type="submit">Save</Button></div>
        </form>
      </Modal>
    </MainAppLayout>
  );
}
