import type { SubscriptionTier, UserRole } from "@/types/domain";

// Navigation is typed separately because it is consumed by layouts and route guards.
export interface NavigationItem {
  label: string;
  href: string;
  description?: string;
  allowedRoles: UserRole[];
  minimumTier?: SubscriptionTier;
}

export interface RouteAccessRule {
  path: string;
  allowedRoles: UserRole[];
  minimumTier?: SubscriptionTier;
}

export interface SubscriptionFeatureRule {
  tier: SubscriptionTier;
  playlistLimit: number;
  canEditProfileImage: boolean;
  canViewAdvancedStats: boolean;
  canUseOfflineMode: boolean;
}

