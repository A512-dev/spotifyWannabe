import type { Playlist } from "@/types/domain";

const LEGACY_PLAYLISTS_KEY = "soundwave_playlists";

export function getPlaylistStorageKey(userId: string) {
  return `soundwave.playlists.${userId}`;
}

function parsePlaylists(value: string | null): Playlist[] | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as Playlist[]) : null;
  } catch {
    return null;
  }
}

export function readStoredPlaylists(userId: string, fallback: Playlist[]) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const storedPlaylists = parsePlaylists(window.localStorage.getItem(getPlaylistStorageKey(userId)));

  if (storedPlaylists) {
    return storedPlaylists;
  }

  const legacyPlaylists = parsePlaylists(window.localStorage.getItem(LEGACY_PLAYLISTS_KEY));

  if (legacyPlaylists) {
    return legacyPlaylists.filter((playlist) => playlist.ownerId === userId);
  }

  return fallback;
}

export function writeStoredPlaylists(userId: string, playlists: Playlist[]) {
  window.localStorage.setItem(getPlaylistStorageKey(userId), JSON.stringify(playlists));
}
