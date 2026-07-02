'use client';

import { useState, useMemo } from "react";
import Link from "next/link";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { AlbumCard, PageHeader, TrackCard } from "@/components/shared";
import { albums } from "@/data/albums";
import { artists } from "@/data/artists";
import { tracks } from "@/data/tracks";

export default function MusicPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const getArtistName = (artistId: string) => {
    return artists.find((artist) => artist.id === artistId)?.stageName || "Unknown Artist";
  };

  const filteredAlbums = useMemo(() => {
    return albums
      .filter((album) => {
        const artistName = getArtistName(album.artistId);
        const query = searchQuery.toLowerCase();
        return (
          album.title.toLowerCase().includes(query) ||
          artistName.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
        }
        return 0;
      });
  }, [searchQuery, sortBy]);

  const filteredTracks = useMemo(() => {
    return tracks
      .filter((track) => {
        const artistName = getArtistName(track.artistId);
        const query = searchQuery.toLowerCase();
        return (
          track.title.toLowerCase().includes(query) ||
          artistName.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
        }
        if (sortBy === "most_played") {
          return b.playCount - a.playCount;
        }
        return 0;
      });
  }, [searchQuery, sortBy]);

  return (
    <MainAppLayout>
      <PageHeader
        description="Music discovery for browsing albums, tracks, artists, and search results."
        title="Music"
      />

      <div className="mt-6 flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by title or artist..."
            className="w-full rounded-md border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-50 focus:border-white focus:outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-50 focus:border-white focus:outline-none"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest Releases</option>
            <option value="oldest">Oldest Releases</option>
            <option value="most_played">Most Played (Tracks)</option>
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
              <TrackCard artistName={getArtistName(track.artistId)} key={track.id} track={track} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No tracks found matching your search.</p>
        )}
      </section>
    </MainAppLayout>
  );
}