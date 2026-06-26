import type { SubscriptionPrice } from "@/types/domain";

export const subscriptionPrices: SubscriptionPrice[] = [
  {
    tier: "basic",
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    currency: "USD",
    playlistLimit: 5,
    supportsOfflineMode: false,
    supportsAdvancedStats: false
  },
  {
    tier: "silver",
    monthlyPriceCents: 699,
    annualPriceCents: 6990,
    currency: "USD",
    playlistLimit: 25,
    supportsOfflineMode: true,
    supportsAdvancedStats: false
  },
  {
    tier: "gold",
    monthlyPriceCents: 1199,
    annualPriceCents: 11990,
    currency: "USD",
    playlistLimit: 100,
    supportsOfflineMode: true,
    supportsAdvancedStats: true
  }
];

