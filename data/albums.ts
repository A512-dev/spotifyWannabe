import type { Album } from "@/types/domain";

export const albums: Album[] = [
  {
    id: "album-after-midnight",
    title: "After Midnight",
    artistId: "artist-lina",
    coverImageUrl: "/mock/albums/after-midnight.png",
    releaseDate: "2026-02-14T00:00:00.000Z",
    trackIds: ["track-neon-rain", "track-glass-hearts"]
  },
  {
    id: "album-city-lights",
    title: "City Lights",
    artistId: "artist-lina",
    coverImageUrl: "/mock/albums/city-lights.png",
    releaseDate: "2025-08-01T00:00:00.000Z",
    trackIds: ["track-starlit-static"]
  }
];
