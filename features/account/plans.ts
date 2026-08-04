import { apiRequest } from "@/lib/api";

export interface SubscriptionPlanApi {
  tier: "basic" | "silver" | "gold";
  monthlyPriceCents: number;
  currency: "USD" | "EUR" | "IRR";
  playlistLimit: number | null;
  canUploadProfileImage?: boolean;
  canDownloadTracks?: boolean;
  hasEarlyAccess?: boolean;
  canViewAdvancedStats?: boolean;
  periodPrices: Record<string, number>;
}

export const planApi = {
  list() {
    return apiRequest<SubscriptionPlanApi[]>("/operations/subscription-prices/");
  }
};
