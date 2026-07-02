import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/formatters";
import type { Album } from "@/types/domain";

interface AlbumCardProps {
  album: Album;
  artistName?: string;
}

export function AlbumCard({ album, artistName }: AlbumCardProps) {
  return (
    <Card>
      {album.coverImageUrl ? (
        <img
          alt={`${album.title} cover`}
          className="aspect-square w-full rounded-md object-cover"
          src={album.coverImageUrl}
        />
      ) : (
        <div className="aspect-square rounded-md bg-surface-700" />
      )}
      <p className="mt-3 truncate font-medium text-slate-50">{album.title}</p>
      <p className="truncate text-sm text-slate-400">{artistName ?? "Unknown artist"}</p>
      <p className="mt-2 text-xs text-slate-500">{formatDate(album.releaseDate)}</p>
    </Card>
  );
}
