import type { SubscriptionTier, UserRole } from "@/types/domain";

/**
 * Navigation/access configuration types are separated from the larger domain
 * model because layout and authorization code consume them together.
 */
export interface NavigationItem {
  /** Text rendered by the sidebar or account navigation. */
  label: string;
  /** Internal application destination. */
  href: string;
  /** Optional explanatory copy for future menu/help UIs. */
  description?: string;
  /** Item remains hidden unless the signed-in user has one of these roles. */
  allowedRoles: UserRole[];
  /** Reserved for tier-aware navigation; current menus only filter by role. */
  minimumTier?: SubscriptionTier;
}

/** Declarative rule used by canAccessRoute for protected route prefixes. */
export interface RouteAccessRule {
  path: string;
  allowedRoles: UserRole[];
  minimumTier?: SubscriptionTier;
}

/** Complete set of plan-specific product capabilities. */
export interface SubscriptionFeatureRule {
  tier: SubscriptionTier;
  playlistLimit: number;
  canEditProfileImage: boolean;
  canViewAdvancedStats: boolean;
  canUseOfflineMode: boolean;
}
