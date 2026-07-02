import { UNLIMITED_PLAYLIST_LIMIT } from "@/config/access";
import type { SubscriptionPrice } from "@/types/domain";

// Phase 1 mock prices. The admin dashboard can update Silver and Gold prices locally.
// Phase 2 should persist these values in the backend so pricing changes never require code changes.
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