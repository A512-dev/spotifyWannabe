'use client';

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/formatters";
import type { Album } from "@/types/domain";

interface AlbumCardProps {
  album: Album;
  artistName?: string;
}

export function AlbumCard({ album, artistName }: AlbumCardProps) {
  const router = useRouter();

  const handleArtistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/artist/${album.artistId}`);
  };

  return (
    <Card>
      <div className="aspect-square overflow-hidden rounded-md bg-surface-700">
        {album.coverImageUrl && (
          <img 
            alt={album.title} 
            className="h-full w-full object-cover" 
            src={album.coverImageUrl} 
          />
        )}
      </div>
      <p className="mt-3 truncate font-medium text-slate-50">{album.title}</p>
      {artistName ? (
        <span
          className="relative z-10 block cursor-pointer truncate text-sm text-slate-400 hover:text-slate-300 hover:underline"
          onClick={handleArtistClick}
        >
          {artistName}
        </span>
      ) : (
        <p className="truncate text-sm text-slate-400">Unknown artist</p>
      )}
      <p className="mt-2 text-xs text-slate-500">{formatDate(album.releaseDate)}</p>
    </Card>
  );
}