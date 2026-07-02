import type { Playlist, PlaylistItem } from "@/types/domain";

export const playlistItems: PlaylistItem[] = [
  {
    id: "playlist-item-1",
    playlistId: "playlist-focus",
    trackId: "track-neon-rain",
    addedByUserId: "user-listener-1",
    addedAt: "2026-05-01T10:30:00.000Z",
    sortOrder: 1
  },
  {
    id: "playlist-item-2",
    playlistId: "playlist-focus",
    trackId: "track-starlit-static",
    addedByUserId: "user-listener-1",
    addedAt: "2026-05-01T10:32:00.000Z",
    sortOrder: 2
  },
  {
    id: "playlist-item-3",
    playlistId: "playlist-weekend",
    trackId: "track-glass-hearts",
    addedByUserId: "user-listener-2",
    addedAt: "2026-05-10T21:15:00.000Z",
    sortOrder: 1
  }
];

export const playlists: Playlist[] = [
  {
    id: "playlist-focus",
    ownerId: "user-listener-1",
    title: "Focus Glow",
    description: "Polished electronic tracks for deep work.",
    coverImageUrl: "/mock/playlists/focus-glow.png",
    isPublic: true,
    itemIds: ["track-neon-rain", "track-starlit-static"],
    createdAt: "2026-04-15T12:00:00.000Z",
    updatedAt: "2026-05-01T10:32:00.000Z"
  },
  {
    id: "playlist-weekend",
    ownerId: "user-listener-2",
    title: "Weekend Soft Reset",
    description: "Easy songs for a quiet Saturday morning.",
    coverImageUrl: "/mock/playlists/weekend-soft-reset.png",
    isPublic: false,
    itemIds: ["track-glass-hearts"],
    createdAt: "2026-05-10T21:10:00.000Z",
    updatedAt: "2026-05-10T21:15:00.000Z"
  }
];
