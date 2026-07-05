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
    <div 
      onClick={() => router.push(`/music/album/${album.id}`)}
      className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.06] hover:shadow-[0_15px_35px_rgba(0,0,0,0.6)] cursor-pointer group"
    >
      {album.coverImageUrl ? (
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
      
      {/* عنوان آلبوم با رنگ سفید و وزن فونت ضخیم‌تر */}
      <p className="mt-3 truncate font-bold text-white group-hover:text-brand-secondary transition-colors">
        {album.title}
      </p>
      
      {/* نام خواننده با رنگ بنفش/سفید ملایم و خوانا بر روی پس‌زمینه تیره */}
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
      
      {/* تاریخ انتشار */}
      <p className="mt-2 text-xs text-white/40">{formatDate(album.releaseDate)}</p>
    </div>
  );
}