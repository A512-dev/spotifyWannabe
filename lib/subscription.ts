import { SUBSCRIPTION_FEATURE_RULES } from "@/config/access";
import type { SubscriptionTier, User } from "@/types/domain";

function getSubscriptionRule(tier: SubscriptionTier) {
  return SUBSCRIPTION_FEATURE_RULES.find((rule) => rule.tier === tier);
}

export function getPlaylistLimit(tier: SubscriptionTier) {
  return getSubscriptionRule(tier)?.playlistLimit ?? 0;
}

export function canCreatePlaylist(user: User, currentPlaylistCount: number) {
  return currentPlaylistCount < getPlaylistLimit(user.subscriptionTier);
}

export function canAccessAdvancedStats(user: User) {
  return Boolean(getSubscriptionRule(user.subscriptionTier)?.canViewAdvancedStats);
}

export function canEditProfileImage(user: User) {
  return Boolean(getSubscriptionRule(user.subscriptionTier)?.canEditProfileImage);
}

