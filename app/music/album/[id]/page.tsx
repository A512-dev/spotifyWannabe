'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { EmptyState, TrackCard } from "@/components/shared";
import { Button } from "@/components/ui";
import { albums } from "@/data/albums";
import { artists } from "@/data/artists";
import { tracks } from "@/data/tracks";
import { usePlayer } from "@/providers";

interface AlbumPageProps {
  params: {
    id: string;
  };
}

export default function AlbumPage({ params }: AlbumPageProps) {
  const router = useRouter();
  const { playerState, setPlayerState } = usePlayer();
  const album = albums.find((item) => item.id === params.id);
  const albumTracks = tracks.filter((track) => album?.trackIds.includes(track.id));
  const artist = artists.find((item) => item.id === album?.artistId);
  const queueTrackIds = albumTracks.map((track) => track.id);

  const playAlbumFrom = (trackId?: string) => {
    if (!trackId || queueTrackIds.length === 0) {
      return;
    }

    localStorage.setItem("soundwave_active_queue", JSON.stringify(queueTrackIds));
    setPlayerState({
      ...playerState,
      currentTrackId: trackId,
      queueTrackIds,
      isPlaying: true
    });
  };

  const handleShuffle = (event: MouseEvent<HTMLButtonElement>) => {
    if (queueTrackIds.length === 0) {
      return;
    }

    const randomTrackId = queueTrackIds[Math.floor(event.timeStamp) % queueTrackIds.length];
    playAlbumFrom(randomTrackId);
  };

  return (
    <MainAppLayout>
      {album ? (
        <>
          <div className="mb-8 flex flex-col items-center gap-6 sm:flex-row sm:items-end mt-4">
            {album.coverImageUrl ? (
              <img
                alt={album.title}
                className="h-48 w-48 rounded-md object-cover shadow-2xl"
                src={album.coverImageUrl}
              />
            ) : (
              <div className="flex h-48 w-48 items-center justify-center rounded-md bg-surface-800 shadow-2xl">
                <span className="text-slate-500">No Cover</span>
              </div>
            )}
            
            <div className="flex flex-col gap-3 text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Album
              </span>
              <h1 className="text-4xl font-extrabold text-slate-50 md:text-5xl lg:text-7xl">
                {album.title}
              </h1>
              <div className="mt-2 flex items-center justify-center gap-2 text-sm text-slate-300 sm:justify-start">
                {artist ? (
                  <Link 
                    href={`/artist/${artist.id}`} 
                    className="font-semibold text-slate-50 hover:underline"
                  >
                    {artist.stageName}
                  </Link>
                ) : (
                  <span className="font-semibold text-slate-50">Unknown Artist</span>
                )}
                <span>•</span>
                <span>{new Date(album.releaseDate).getFullYear()}</span>
                <span>•</span>
                <span>{albumTracks.length} tracks</span>
              </div>
            </div>
          </div>

          <div className="mb-8 flex items-center gap-4">
            <Button
              className="rounded-full px-8 py-3 text-base font-bold"
              onClick={() => playAlbumFrom(queueTrackIds[0])}
              size="lg"
              variant="primary"
            >
              Play
            </Button>
            <Button
              className="rounded-full px-8 py-3 text-base font-bold"
              onClick={handleShuffle}
              size="lg"
              variant="secondary"
            >
              Shuffle
            </Button>
          </div>

          <section className="grid gap-2">
            <div className="mb-2 grid grid-cols-[auto_1fr_auto] gap-4 border-b border-surface-700 pb-2 px-4 text-sm text-slate-400">
              <span>#</span>
              <span>Title</span>
              <span>Duration</span>
            </div>
            {albumTracks.map((track, index) => (
              <div key={track.id} className="group flex items-center gap-4 rounded-md hover:bg-surface-800/50">
                <div className="flex w-8 justify-center text-slate-400">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <TrackCard artistName={artist?.stageName} contextQueue={queueTrackIds} track={track} />
                </div>
              </div>
            ))}
          </section>
        </>
      ) : (
        <EmptyState 
          action={
            <Button onClick={() => router.push("/music")} variant="secondary">
              Back to music
            </Button>
          }
          description="The requested album does not exist in the mock catalog." 
          title="Album not found" 
        />
      )}
    </MainAppLayout>
  );
}
