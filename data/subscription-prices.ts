import { UNLIMITED_PLAYLIST_LIMIT } from "@/config/access";
import type { SubscriptionPrice } from "@/types/domain";

// Phase 1 seed prices. The admin dashboard copies and edits Silver/Gold amounts
// locally. A backend should eventually own pricing so changes are durable and
// cannot be manipulated as client-side state.
export const subscriptionPrices: SubscriptionPrice[] = [
  {
    tier: "basic",
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    currency: "USD",
    playlistLimit: 6,
    supportsOfflineMode: false,
    supportsAdvancedStats: false
  },
  {
    tier: "silver",
    monthlyPriceCents: 699,
    annualPriceCents: 6990,
    currency: "USD",
    playlistLimit: 100,
    supportsOfflineMode: true,
    supportsAdvancedStats: false
  },
  {
    tier: "gold",
    monthlyPriceCents: 1199,
    annualPriceCents: 11990,
    currency: "USD",
    playlistLimit: UNLIMITED_PLAYLIST_LIMIT,
    supportsOfflineMode: true,
    supportsAdvancedStats: true
  }
];
