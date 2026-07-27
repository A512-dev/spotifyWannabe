import type { SubscriptionTier, UserRole } from "@/types/domain";

// Central labels keep stored enum values separate from polished UI copy and make
// TypeScript verify that every possible role and tier has a display label.
export const ROLE_LABELS: Record<UserRole, string> = {
  listener: "Listener",
  artist: "Artist",
  support: "Support",
  admin: "Admin"
};

export const SUBSCRIPTION_LABELS: Record<SubscriptionTier, string> = {
  basic: "Basic",
  silver: "Silver",
  gold: "Gold"
};
