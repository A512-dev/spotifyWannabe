import { ROLE_LABELS, SUBSCRIPTION_LABELS } from "@/constants/labels";
import type { SubscriptionTier, UserRole } from "@/types/domain";

/** Converts the stored role enum into consistent display copy. */
export function getRoleLabel(role: UserRole) {
  return ROLE_LABELS[role];
}

/** Converts the stored plan enum into consistent display copy. */
export function getSubscriptionLabel(tier: SubscriptionTier) {
  return SUBSCRIPTION_LABELS[tier];
}
