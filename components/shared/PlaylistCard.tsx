"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useUserPreferences } from "@/providers";
import type { Playlist } from "@/types/domain";

interface PlaylistCardProps {
  playlist: Playlist;
}

export function PlaylistCard({ playlist }: PlaylistCardProps) {
  const { t } = useUserPreferences();
  return (
    <Card>
      {playlist.coverImageUrl ? (
        <img
          alt={t("{title} cover", { title: playlist.title })}
          className="aspect-square w-full rounded-md object-cover"
          src={playlist.coverImageUrl}
        />
      ) : (
        <div className="aspect-square rounded-md bg-surface-700" />
      )}
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-50">{playlist.title}</p>
          <p className="mt-1 line-clamp-2 text-sm text-slate-400">
            {playlist.description ?? t("No description yet.")}
          </p>
        </div>
        <Badge>{t(playlist.isPublic ? "Public" : "Private")}</Badge>
      </div>
    </Card>
  );
}
