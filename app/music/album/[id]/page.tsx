"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState, type MouseEvent } from "react";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { EmptyState, TrackCard } from "@/components/shared";
import { Button } from "@/components/ui";
import { musicApi } from "@/features/music/api";
import { usePlayer } from "@/providers";
import type { Album, Track } from "@/types/domain";

interface AlbumPageProps {
  params: Promise<{ id: string }>;
}

type ApiAlbum = Album & { artistName?: string; tracks?: Track[] };

export default function AlbumPage({ params }: AlbumPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { playerState, setPlayerState, refreshTracks } = usePlayer();
  const [album, setAlbum] = useState<ApiAlbum | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    void musicApi.getAlbum(id)
      .then((result) => setAlbum(result as ApiAlbum))
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [id]);

  const albumTracks = useMemo(() => album?.tracks ?? [], [album?.tracks]);
  const queueTrackIds = useMemo(() => albumTracks.map((track) => track.id), [albumTracks]);

  const playAlbumFrom = async (trackId?: string) => {
    if (!trackId || queueTrackIds.length === 0) return;
    await refreshTracks();
    localStorage.setItem("soundwave_active_queue", JSON.stringify(queueTrackIds));
    setPlayerState({ ...playerState, currentTrackId: trackId, queueTrackIds, isPlaying: true });
  };

  const handleShuffle = (event: MouseEvent<HTMLButtonElement>) => {
    if (queueTrackIds.length === 0) return;
    const randomTrackId = queueTrackIds[Math.floor(event.timeStamp) % queueTrackIds.length];
    void playAlbumFrom(randomTrackId);
  };

  if (loading) return <MainAppLayout>Loading album...</MainAppLayout>;

  return (
    <MainAppLayout>
      {album ? (
        <>
          <div className="mb-8 mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-end">
            {album.coverImageUrl ? <img alt={album.title} className="h-48 w-48 rounded-md object-cover shadow-2xl" src={album.coverImageUrl} /> : <div className="flex h-48 w-48 items-center justify-center rounded-md bg-surface-800">No cover</div>}
            <div className="flex flex-col gap-3 text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Album</span>
              <h1 className="text-4xl font-extrabold md:text-6xl">{album.title}</h1>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-300 sm:justify-start">
                <Link className="font-semibold hover:underline" href={`/artist/${album.artistId}`}>{album.artistName ?? "Unknown artist"}</Link>
                <span>•</span><span>{new Date(album.releaseDate).getFullYear()}</span><span>•</span><span>{albumTracks.length} tracks</span>
              </div>
            </div>
          </div>
          <div className="mb-8 flex gap-4">
            <Button disabled={queueTrackIds.length === 0} onClick={() => void playAlbumFrom(queueTrackIds[0])} size="lg">Play</Button>
            <Button disabled={queueTrackIds.length === 0} onClick={handleShuffle} size="lg" variant="secondary">Shuffle</Button>
          </div>
          <section className="grid gap-2">
            {albumTracks.map((track, index) => (
              <div className="flex items-center gap-4" key={track.id}>
                <div className="w-8 text-center text-slate-400">{index + 1}</div>
                <div className="flex-1"><TrackCard artistName={track.artistName ?? album.artistName} contextQueue={queueTrackIds} track={track} /></div>
              </div>
            ))}
          </section>
        </>
      ) : (
        <EmptyState action={<Button onClick={() => router.push("/music")} variant="secondary">Back to music</Button>} description={error || "The requested album does not exist."} title="Album not found" />
      )}
    </MainAppLayout>
  );
}
