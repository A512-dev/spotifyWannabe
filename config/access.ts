import type { RouteAccessRule, SubscriptionFeatureRule } from "@/types/navigation";

// Phase 1 keeps route access rules centralized so layouts, future middleware,
// and backend integration can reuse the same role contracts.
export const ROUTE_ACCESS_RULES: RouteAccessRule[] = [
  {
    path: "/artist-dashboard",
    allowedRoles: ["artist", "admin"]
  },
  {
    path: "/support",
    allowedRoles: ["support", "admin"]
  },
  {
    path: "/admin",
    allowedRoles: ["admin"]
  },
  {
    path: "/settings",
    allowedRoles: ["listener", "artist", "support", "admin"]
  }
];

// Playlist limits follow the project PDF:
// Basic = 6 playlists, Silver = 100 playlists, Gold = unlimited.
export const UNLIMITED_PLAYLIST_LIMIT = Number.POSITIVE_INFINITY;

// Subscription rules keep product limits and premium permissions out of page components.
export const SUBSCRIPTION_FEATURE_RULES: SubscriptionFeatureRule[] = [
  {
    tier: "basic",
    playlistLimit: 6,
    canEditProfileImage: false,
    canViewAdvancedStats: false,
    canUseOfflineMode: false
  },
  {
    tier: "silver",
    playlistLimit: 100,
    canEditProfileImage: true,
    canViewAdvancedStats: false,
    canUseOfflineMode: true
  },
  {
    tier: "gold",
    playlistLimit: UNLIMITED_PLAYLIST_LIMIT,
    canEditProfileImage: true,
    canViewAdvancedStats: true,
    canUseOfflineMode: true
  }
];