import { apiRequest, type PaginatedResponse, toQuery } from "@/lib/api";
import type { Album, Playlist, Track } from "@/types/domain";

export interface ListeningHistoryEntry {
  track: Track;
  lastPlayedAt: string;
  playCount: number;
}

export interface PlaylistPlaybackEntry {
  playlist: PlaylistWithItems;
  lastPlayedAt: string;
  playCount: number;
}

export interface HomeResponse {
  latestTracks: Track[];
  trendingTracks: Track[];
  earlyAccessTracks: Track[];
  recommendedTracks: RecommendationEntry[];
  recentlyPlayed: ListeningHistoryEntry[];
  recentlyPlayedPlaylists: PlaylistPlaybackEntry[];
}

export interface RecommendationEntry {
  track: Track;
  reason: string;
}

export interface PlaylistWithItems extends Playlist {
  items?: Array<{ id: string; track: Track; sortOrder: number }>;
}

export const musicApi = {
  listTracks(params: { search?: string; ordering?: string; genre?: string } = {}) {
    return apiRequest<PaginatedResponse<Track>>(`/music/tracks/${toQuery(params)}`);
  },
  getTrack(id: string) {
    return apiRequest<Track>(`/music/tracks/${id}/`);
  },
  listAlbums(params: { search?: string; ordering?: string } = {}) {
    return apiRequest<PaginatedResponse<Album>>(`/music/albums/${toQuery(params)}`);
  },
  getAlbum(id: string) {
    return apiRequest<Album>(`/music/albums/${id}/`);
  },
  home() {
    return apiRequest<HomeResponse>("/music/home/");
  },
  history() {
    return apiRequest<PaginatedResponse<ListeningHistoryEntry>>("/music/history/");
  },
  registerStream(trackId: string, sessionId: string, listenedSeconds: number) {
    return apiRequest(`/music/tracks/${trackId}/stream/`, {
      method: "POST",
      body: JSON.stringify({ sessionId, listenedSeconds })
    });
  },
  playback(trackId: string) {
    return apiRequest<{ streamUrl: string }>(`/music/tracks/${trackId}/playback/`);
  },
  download(trackId: string) {
    return apiRequest<{ downloadUrl: string }>(`/music/tracks/${trackId}/download/`);
  },
  listPlaylists() {
    return apiRequest<PaginatedResponse<PlaylistWithItems>>("/playlists/?owner=me");
  },
  createPlaylist(title: string) {
    return apiRequest<PlaylistWithItems>("/playlists/", {
      method: "POST",
      body: JSON.stringify({ title, description: "", isPublic: false })
    });
  },
  savePlaylist(data: FormData, id?: string) {
    return apiRequest<PlaylistWithItems>(id ? `/playlists/${id}/` : "/playlists/", {
      method: id ? "PATCH" : "POST",
      body: data,
    });
  },
  renamePlaylist(id: string, title: string) {
    return apiRequest<PlaylistWithItems>(`/playlists/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ title })
    });
  },
  deletePlaylist(id: string) {
    return apiRequest<void>(`/playlists/${id}/`, { method: "DELETE" });
  },
  addTrackToPlaylist(playlistId: string, trackId: string) {
    return apiRequest(`/playlists/${playlistId}/tracks/`, {
      method: "POST",
      body: JSON.stringify({ trackId })
    });
  },
  removeTrackFromPlaylist(playlistId: string, trackId: string) {
    return apiRequest<void>(`/playlists/${playlistId}/tracks/${trackId}/`, { method: "DELETE" });
  },
  markPlaylistPlayed(playlistId: string) {
    return apiRequest<{ recorded: boolean }>(`/playlists/${playlistId}/played/`, { method: "POST" });
  }
};

export interface GenreApi {
  id: number;
  name: string;
  slug: string;
}

export interface ArtistProfileApi {
  id: string;
  userId: string;
  stageName: string;
  bio: string;
  genreTags: string[];
  profileImageUrl?: string;
  bannerImageUrl?: string;
  approvalStatus: "approved" | "pending";
  verifiedAt?: string;
  followerCount: number;
  monthlyListeners: number | null;
  trackCount: number;
  albumCount: number;
  totalStreams: number | null;
  isFollowing: boolean;
}

export interface TrackStatsApi {
  streamCount: number;
  uniqueListeners: number;
}

export const artistCatalogApi = {
  listGenres() {
    return apiRequest<GenreApi[]>("/music/genres/");
  },
  listArtistProfiles(params: { search?: string } = {}) {
    return apiRequest<PaginatedResponse<ArtistProfileApi>>(`/artists/profiles/${toQuery(params)}`);
  },
  getArtistProfile(id: string) {
    return apiRequest<ArtistProfileApi>(`/artists/profiles/${id}/`);
  },
  updateArtistProfile(id: string, data: FormData) {
    return apiRequest<ArtistProfileApi>(`/artists/profiles/${id}/`, { method: "PATCH", body: data });
  },
  followUser(userId: string) {
    return apiRequest<{ isFollowing: boolean; followerCount: number }>(`/accounts/users/${userId}/follow/`, {
      method: "POST"
    });
  },
  unfollowUser(userId: string) {
    return apiRequest<{ isFollowing: boolean; followerCount: number }>(`/accounts/users/${userId}/follow/`, {
      method: "DELETE"
    });
  },
  createAlbum(data: FormData) {
    return apiRequest<Album>("/music/albums/", { method: "POST", body: data });
  },
  createAlbumRelease(data: FormData) {
    return apiRequest<Album>("/music/albums/release/", { method: "POST", body: data });
  },
  updateAlbum(id: string, data: FormData) {
    return apiRequest<Album>(`/music/albums/${id}/`, { method: "PATCH", body: data });
  },
  deleteAlbum(id: string) {
    return apiRequest<void>(`/music/albums/${id}/`, { method: "DELETE" });
  },
  createTrack(data: FormData) {
    return apiRequest<Track>("/music/tracks/", { method: "POST", body: data });
  },
  updateTrack(id: string, data: FormData) {
    return apiRequest<Track>(`/music/tracks/${id}/`, { method: "PATCH", body: data });
  },
  deleteTrack(id: string) {
    return apiRequest<void>(`/music/tracks/${id}/`, { method: "DELETE" });
  },
  getTrackStats(id: string) {
    return apiRequest<TrackStatsApi>(`/music/tracks/${id}/stats/`);
  }
};
