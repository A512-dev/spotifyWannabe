import { apiRequest } from "@/lib/api";
import type { SubscriptionPlanApi } from "@/features/account/plans";

export interface CurrentSubscriptionResponse {
  tier: "basic" | "silver" | "gold";
  subscription: null | {
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
    plan: SubscriptionPlanApi;
  };
}

export interface PaymentResponse {
  id: string;
  tier: "silver" | "gold";
  months: number;
  amountCents: number;
  currency: string;
  status: "pending" | "success" | "failed" | "canceled";
  referenceId?: string;
}

export const subscriptionApi = {
  current() {
    return apiRequest<CurrentSubscriptionResponse>("/subscriptions/current/");
  },
  initiate(tier: "silver" | "gold", months: 1 | 3 | 6 | 12, callbackUrl: string) {
    return apiRequest<{ payment: PaymentResponse; paymentUrl: string }>("/subscriptions/payments/initiate/", {
      method: "POST",
      body: JSON.stringify({ tier, months, callbackUrl })
    });
  },
  verify(authority: string, paymentStatus: string) {
    const query = new URLSearchParams({ Authority: authority, Status: paymentStatus });
    return apiRequest<PaymentResponse>(`/subscriptions/payments/callback/?${query.toString()}`, {}, { auth: false });
  }
};
