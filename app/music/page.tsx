"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { AlbumCard, PageHeader, TrackCard } from "@/components/shared";
import { albums } from "@/data/albums";
import { artists } from "@/data/artists";
import { playlists as defaultPlaylists } from "@/data/playlists";
import { tracks } from "@/data/tracks";
import { readStoredPlaylists, writeStoredPlaylists } from "@/lib/playlist-storage";
import { useAuth } from "@/providers";
import type { Track } from "@/types/domain";

function getArtistName(artistId: string) {
  return artists.find((artist) => artist.id === artistId)?.stageName ?? "Unknown artist";
}

function MusicPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [message, setMessage] = useState("");
  const targetPlaylistId = searchParams.get("addToPlaylist");

  const filteredAlbums = useMemo(() => {
    return albums
      .filter((album) => {
        const artistName = getArtistName(album.artistId);
        const query = searchQuery.toLowerCase();
        return album.title.toLowerCase().includes(query) || artistName.toLowerCase().includes(query);
      })
      .sort((first, second) => {
        if (sortBy === "newest") {
          return new Date(second.releaseDate).getTime() - new Date(first.releaseDate).getTime();
        }

        if (sortBy === "oldest") {
          return new Date(first.releaseDate).getTime() - new Date(second.releaseDate).getTime();
        }

        return 0;
      });
  }, [searchQuery, sortBy]);

  const filteredTracks = useMemo(() => {
    return tracks
      .filter((track) => {
        const artistName = getArtistName(track.artistId);
        const query = searchQuery.toLowerCase();
        return track.title.toLowerCase().includes(query) || artistName.toLowerCase().includes(query);
      })
      .sort((first, second) => {
        if (sortBy === "newest") {
          return new Date(second.releaseDate).getTime() - new Date(first.releaseDate).getTime();
        }

        if (sortBy === "oldest") {
          return new Date(first.releaseDate).getTime() - new Date(second.releaseDate).getTime();
        }

        if (sortBy === "most_played") {
          return second.playCount - first.playCount;
        }

        return 0;
      });
  }, [searchQuery, sortBy]);

  const handleAddTrackToPlaylist = (track: Track) => {
    if (!currentUser || !targetPlaylistId) {
      return;
    }

    const fallbackPlaylists = defaultPlaylists.filter((playlist) => playlist.ownerId === currentUser.id);
    const storedPlaylists = readStoredPlaylists(currentUser.id, fallbackPlaylists);
    let playlistFound = false;
    let trackAlreadyAdded = false;
    const updatedPlaylists = storedPlaylists.map((playlist) => {
      if (playlist.id !== targetPlaylistId) {
        return playlist;
      }

      playlistFound = true;

      if (playlist.itemIds.includes(track.id)) {
        trackAlreadyAdded = true;
        return playlist;
      }

      return {
        ...playlist,
        itemIds: [...playlist.itemIds, track.id],
        updatedAt: new Date().toISOString()
      };
    });

    if (!playlistFound) {
      setMessage("Playlist was not found.");
      return;
    }

    writeStoredPlaylists(currentUser.id, updatedPlaylists);

    if (trackAlreadyAdded) {
      setMessage(`${track.title} is already in this playlist.`);
      return;
    }

    router.push("/playlists");
  };

  return (
    <MainAppLayout>
      <PageHeader
        description={
          targetPlaylistId
            ? "Choose a track to add it to the selected playlist."
            : "Music discovery for browsing albums, tracks, artists, and search results."
        }
        title="Music"
      />

      {message ? <p className="mt-4 text-sm text-yellow-200">{message}</p> : null}

      <div className="mt-6 flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-50 focus:border-white focus:outline-none"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by title or artist..."
            type="text"
            value={searchQuery}
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-50 focus:border-white focus:outline-none"
            onChange={(event) => setSortBy(event.target.value)}
            value={sortBy}
          >
            <option value="newest">Newest releases</option>
            <option value="oldest">Oldest releases</option>
            <option value="most_played">Most played tracks</option>
          </select>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold text-slate-50">Albums</h2>
        {filteredAlbums.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredAlbums.map((album) => (
              <Link href={`/music/album/${album.id}`} key={album.id}>
                <AlbumCard album={album} artistName={getArtistName(album.artistId)} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No albums found matching your search.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold text-slate-50">Tracks</h2>
        {filteredTracks.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {filteredTracks.map((track) => (
              <TrackCard
                artistName={getArtistName(track.artistId)}
                key={track.id}
                onSelect={targetPlaylistId ? handleAddTrackToPlaylist : undefined}
                track={track}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No tracks found matching your search.</p>
        )}
      </section>
    </MainAppLayout>
  );
}

export default function MusicPage() {
  return (
    <Suspense fallback={<MainAppLayout>Loading music...</MainAppLayout>}>
      <MusicPageContent />
    </Suspense>
  );
}
