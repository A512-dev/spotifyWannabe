import { SUBSCRIPTION_FEATURE_RULES } from "@/config/access";
import type { SubscriptionTier, User } from "@/types/domain";

function getSubscriptionRule(tier: SubscriptionTier) {
  return SUBSCRIPTION_FEATURE_RULES.find((rule) => rule.tier === tier);
}

export function getPlaylistLimit(tier: SubscriptionTier) {
  return getSubscriptionRule(tier)?.playlistLimit ?? 0;
}

export function hasUnlimitedPlaylistLimit(tier: SubscriptionTier) {
  return !Number.isFinite(getPlaylistLimit(tier));
}

export function formatPlaylistLimit(tier: SubscriptionTier) {
  const limit = getPlaylistLimit(tier);

  return Number.isFinite(limit) ? String(limit) : "Unlimited";
}

export function canCreatePlaylist(user: User, currentPlaylistCount: number) {
  const limit = getPlaylistLimit(user.subscriptionTier);

  return currentPlaylistCount < limit;
}

export function canAccessAdvancedStats(user: User) {
  return Boolean(getSubscriptionRule(user.subscriptionTier)?.canViewAdvancedStats);
}

export function canEditProfileImage(user: User) {
  return Boolean(getSubscriptionRule(user.subscriptionTier)?.canEditProfileImage);
}

export function canUseOfflineMode(user: User) {
  return Boolean(getSubscriptionRule(user.subscriptionTier)?.canUseOfflineMode);
}