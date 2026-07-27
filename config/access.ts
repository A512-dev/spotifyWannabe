import type { RouteAccessRule, SubscriptionFeatureRule } from "@/types/navigation";

// Protected prefixes are centralized so the client layout, future middleware,
// and a backend can share one role policy. Unlisted paths have no role restriction.
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

// JavaScript's Infinity is the numeric "unlimited" sentinel. Comparisons such as
// `currentCount < limit` therefore work without a separate gold-tier branch.
export const UNLIMITED_PLAYLIST_LIMIT = Number.POSITIVE_INFINITY;

// Product entitlements live in configuration rather than being scattered across
// JSX. Pages should query them through the helpers in lib/subscription.ts.
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
