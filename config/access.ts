import type { RouteAccessRule, SubscriptionFeatureRule } from "@/types/navigation";

// Route rules are simple for Phase 1. Later, middleware or server components can consume this config.
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

// Subscription rules keep product limits out of page components.
export const SUBSCRIPTION_FEATURE_RULES: SubscriptionFeatureRule[] = [
  {
    tier: "basic",
    playlistLimit: 5,
    canEditProfileImage: false,
    canViewAdvancedStats: false,
    canUseOfflineMode: false
  },
  {
    tier: "silver",
    playlistLimit: 25,
    canEditProfileImage: true,
    canViewAdvancedStats: false,
    canUseOfflineMode: true
  },
  {
    tier: "gold",
    playlistLimit: 100,
    canEditProfileImage: true,
    canViewAdvancedStats: true,
    canUseOfflineMode: true
  }
];

