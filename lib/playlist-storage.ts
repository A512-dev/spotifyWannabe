import type { Playlist } from "@/types/domain";

// Older builds stored every user's playlists under one key. It remains readable
// so browser data from that schema can be migrated transparently.
const LEGACY_PLAYLISTS_KEY = "soundwave_playlists";

/** Namespaces playlist persistence by account to prevent cross-user leakage. */
export function getPlaylistStorageKey(userId: string) {
  return `soundwave.playlists.${userId}`;
}

function parsePlaylists(value: string | null): Playlist[] | null {
  // Null means "no usable value", allowing the caller to try another source.
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    // This shallow guard rejects non-arrays; it does not validate every field.
    return Array.isArray(parsed) ? (parsed as Playlist[]) : null;
  } catch {
    // Corrupt local storage should never prevent the page from rendering.
    return null;
  }
}

/** Reads current storage, then legacy storage, then the supplied seed records. */
export function readStoredPlaylists(userId: string, fallback: Playlist[]) {
  // Server rendering has no browser storage, so return deterministic seed data.
  if (typeof window === "undefined") {
    return fallback;
  }

  const storedPlaylists = parsePlaylists(window.localStorage.getItem(getPlaylistStorageKey(userId)));

  if (storedPlaylists) {
    // An empty array is truthy and correctly means "the user deleted all".
    return storedPlaylists;
  }

  const legacyPlaylists = parsePlaylists(window.localStorage.getItem(LEGACY_PLAYLISTS_KEY));

  if (legacyPlaylists) {
    // Legacy storage mixed owners, so keep only this account's playlists.
    return legacyPlaylists.filter((playlist) => playlist.ownerId === userId);
  }

  return fallback;
}

export function writeStoredPlaylists(userId: string, playlists: Playlist[]) {
  // Client components are responsible for calling this browser-only function.
  window.localStorage.setItem(getPlaylistStorageKey(userId), JSON.stringify(playlists));
}
