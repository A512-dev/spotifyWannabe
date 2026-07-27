import { SUBSCRIPTION_FEATURE_RULES } from "@/config/access";
import type { SubscriptionTier, User } from "@/types/domain";

/** Finds the single source-of-truth entitlement row for a subscription tier. */
function getSubscriptionRule(tier: SubscriptionTier) {
  return SUBSCRIPTION_FEATURE_RULES.find((rule) => rule.tier === tier);
}

export function getPlaylistLimit(tier: SubscriptionTier) {
  // Missing configuration fails closed with a zero allowance.
  return getSubscriptionRule(tier)?.playlistLimit ?? 0;
}

export function hasUnlimitedPlaylistLimit(tier: SubscriptionTier) {
  // Gold uses positive Infinity, the only non-finite configured limit.
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

/** True when the user's plan includes artist-style advanced analytics. */
export function canAccessAdvancedStats(user: User) {
  return Boolean(getSubscriptionRule(user.subscriptionTier)?.canViewAdvancedStats);
}

/** True when the user's plan permits a custom avatar URL. */
export function canEditProfileImage(user: User) {
  return Boolean(getSubscriptionRule(user.subscriptionTier)?.canEditProfileImage);
}

/** True when the user's plan advertises offline playback support. */
export function canUseOfflineMode(user: User) {
  return Boolean(getSubscriptionRule(user.subscriptionTier)?.canUseOfflineMode);
}
  // The same comparison works for finite limits and Infinity.
