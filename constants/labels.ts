import type { SubscriptionTier, UserRole } from "@/types/domain";

// Central labels make UI copy consistent across teammates and pages.
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

