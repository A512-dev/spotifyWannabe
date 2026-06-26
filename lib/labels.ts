import { ROLE_LABELS, SUBSCRIPTION_LABELS } from "@/constants/labels";
import type { SubscriptionTier, UserRole } from "@/types/domain";

export function getRoleLabel(role: UserRole) {
  return ROLE_LABELS[role];
}

export function getSubscriptionLabel(tier: SubscriptionTier) {
  return SUBSCRIPTION_LABELS[tier];
}

