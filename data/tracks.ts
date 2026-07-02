import type { Track } from "@/types/domain";

export const tracks: Track[] = [
  {
    id: "track-neon-rain",
    title: "Neon Rain",
    artistId: "artist-lina",
    albumId: "album-after-midnight",
    durationSeconds: 214,
    audioUrl: "/mock/audio/neon-rain.mp3",
    coverImageUrl: "/mock/albums/after-midnight.png",
    playCount: 582100,
    explicit: false,
    releaseDate: "2026-02-14T00:00:00.000Z"
  },
  {
    id: "track-glass-hearts",
    title: "Glass Hearts",
    artistId: "artist-lina",
    albumId: "album-after-midnight",
    durationSeconds: 197,
    audioUrl: "/mock/audio/glass-hearts.mp3",
    coverImageUrl: "/mock/albums/after-midnight.png",
    playCount: 421900,
    explicit: false,
    releaseDate: "2026-02-14T00:00:00.000Z"
  },
  {
    id: "track-starlit-static",
    title: "Starlit Static",
    artistId: "artist-lina",
    albumId: "album-city-lights",
    durationSeconds: 243,
    audioUrl: "/mock/audio/starlit-static.mp3",
    coverImageUrl: "/mock/albums/city-lights.png",
    playCount: 264300,
    explicit: false,
    releaseDate: "2025-08-01T00:00:00.000Z"
  },
  {
    id: "track-blue-spiral",
    title: "Blue Spiral",
    artistId: "artist-orbit",
    durationSeconds: 305,
    audioUrl: "/mock/audio/blue-spiral.mp3",
    coverImageUrl: "/mock/albums/blue-spiral.png",
    playCount: 9100,
    explicit: false,
    releaseDate: "2026-05-03T00:00:00.000Z"
  }
];
