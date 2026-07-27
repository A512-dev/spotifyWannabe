'use client';

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/formatters";
import type { Album } from "@/types/domain";

interface AlbumCardProps {
  album: Album;
  artistName?: string;
}

/**
 * Clickable catalog tile. The tile navigates to the album, while the nested
 * artist name stops propagation and navigates to the artist instead.
 */
export function AlbumCard({ album, artistName }: AlbumCardProps) {
  const router = useRouter();

  const handleArtistClick = (e: React.MouseEvent) => {
    // Prevent a nested artist click from triggering the parent album navigation.
    e.preventDefault();
    e.stopPropagation();
    router.push(`/artist/${album.artistId}`);
  };

  return (
    // The whole visual tile is an album target for convenient pointer use.
    <div 
      onClick={() => router.push(`/music/album/${album.id}`)}
      className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.06] hover:shadow-[0_15px_35px_rgba(0,0,0,0.6)] cursor-pointer group"
    >
      {album.coverImageUrl ? (
        // Artwork fills a square; missing art receives a themed placeholder.
        <img
          alt={`${album.title} cover`}
          className="aspect-square w-full rounded-md object-cover shadow-md transition-transform duration-300 group-hover:scale-[1.02]"
          src={album.coverImageUrl}
        />
      ) : (
        <div className="aspect-square rounded-md bg-brand-primary/20 flex items-center justify-center text-white/40">
          No Cover
        </div>
      )}
      
      {/* Album title is truncated so long names cannot widen the grid column. */}
      <p className="mt-3 truncate font-bold text-white group-hover:text-brand-secondary transition-colors">
        {album.title}
      </p>
      
      {/* Artist behaves as a nested navigation target independent of the album. */}
      {artistName ? (
        <span
          className="relative z-10 block cursor-pointer truncate text-sm text-white/70 hover:text-white hover:underline transition-colors mt-0.5"
          onClick={handleArtistClick}
        >
          {artistName}
        </span>
      ) : (
        <p className="truncate text-sm text-white/40 mt-0.5">Unknown artist</p>
      )}
      
      {/* Release date uses the shared locale-aware formatter. */}
      <p className="mt-2 text-xs text-white/40">{formatDate(album.releaseDate)}</p>
    </div>
  );
}
