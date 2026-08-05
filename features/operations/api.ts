import { apiRequest, type PaginatedResponse, toQuery } from "@/lib/api";
import { planApi, type SubscriptionPlanApi } from "@/features/account/plans";
export type { SubscriptionPlanApi };
import type { ApprovalStatus, TicketPriority, TicketStatus } from "@/types/domain";

export interface ArtistApplicationApi {
  id: string;
  applicantId: string;
  email: string;
  stageName: string;
  portfolioDescription: string;
  status: ApprovalStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
  samples: Array<{ id: string; title: string; kind: "file" | "link"; fileUrl?: string; externalUrl?: string }>;
}

export interface TicketMessageApi {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  isInternalNote: boolean;
  createdAt: string;
}

export interface TicketApi {
  id: string;
  requesterId: string;
  requesterName?: string;
  assignedSupportUserId?: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  messages?: TicketMessageApi[];
}

export interface RevenueRecordApi {
  id: string;
  artistId: string;
  artistName: string;
  periodStart: string;
  periodEnd: string;
  uniqueListeners: number;
  streamCount: number;
  grossRevenueCents: number;
  platformFeeCents: number;
  netRevenueCents: number;
  currency: "USD" | "EUR" | "IRR";
  paymentStatus: "pending" | "settled";
  settledAt?: string;
  trackBreakdown: TrackRevenueBreakdownApi[];
}

export interface ApprovedArtistApi {
  id: string;
  stageName: string;
}

export interface RevenueGenerationInput {
  artistId: string;
  periodStart: string;
  periodEnd: string;
  currency: "USD" | "EUR" | "IRR";
  perStreamCents: number;
  perUniqueListenerCents: number;
  platformFeePercent: number;
}


export const operationsApi = {
  listApplications(params: { status?: string; search?: string } = {}) {
    return apiRequest<PaginatedResponse<ArtistApplicationApi>>(`/artists/applications/${toQuery(params)}`);
  },
  getApplication(id: string) {
    return apiRequest<ArtistApplicationApi>(`/artists/applications/${id}/`);
  },
  reviewApplication(id: string, decision: "approved" | "rejected", reviewNote: string) {
    return apiRequest<ArtistApplicationApi>(`/artists/applications/${id}/review/`, {
      method: "POST",
      body: JSON.stringify({ decision, reviewNote })
    });
  },
  listTickets(params: { status?: string; search?: string } = {}) {
    return apiRequest<PaginatedResponse<TicketApi>>(`/support/tickets/${toQuery(params)}`);
  },
  getTicket(id: string) {
    return apiRequest<TicketApi>(`/support/tickets/${id}/`);
  },
  addTicketMessage(id: string, body: string, isInternalNote = false) {
    return apiRequest<TicketMessageApi>(`/support/tickets/${id}/messages/`, {
      method: "POST",
      body: JSON.stringify({ body, isInternalNote })
    });
  },
  updateTicketStatus(id: string, status: TicketStatus) {
    return apiRequest<TicketApi>(`/support/tickets/${id}/status/`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  },
  createTicket(subject: string, message: string, priority: TicketPriority = "medium") {
    return apiRequest<TicketApi>("/support/tickets/", {
      method: "POST",
      body: JSON.stringify({ subject, message, priority })
    });
  },
  listRevenue() {
    return apiRequest<PaginatedResponse<RevenueRecordApi>>("/reports/artist-revenue/");
  },
  generateRevenue(input: RevenueGenerationInput) {
    return apiRequest<RevenueRecordApi>("/reports/artist-revenue/generate/", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  settleRevenue(id: string) {
    return apiRequest<RevenueRecordApi>(`/reports/artist-revenue/${id}/settle/`, { method: "POST" });
  },
  adminOverview() {
    return apiRequest<AdminOverviewApi>("/reports/admin/overview/");
  },
  supportOverview() {
    return apiRequest<SupportOverviewApi>("/reports/support/overview/");
  },
  artistOverview() {
    return apiRequest<ArtistOverviewApi>("/reports/artist/overview/");
  },
  listApprovedArtists() {
    return apiRequest<PaginatedResponse<ApprovedArtistApi>>("/artists/profiles/");
  },
  listSubscriptionPlans() {
    return planApi.list();
  },
  updateSubscriptionPrice(tier: "silver" | "gold", monthlyPriceCents: number) {
    return apiRequest<SubscriptionPlanApi>(`/operations/subscription-prices/${tier}/`, {
      method: "PATCH",
      body: JSON.stringify({ monthlyPriceCents })
    });
  }
};

export interface SupportOverviewApi {
  tickets: Record<TicketStatus, number>;
  artistApplications: Record<ApprovalStatus, number>;
  urgentOpenTickets: number;
  unassignedOpenTickets: number;
  generatedAt: string;
}

export interface CurrencyBreakdownApi {
  currency: "USD" | "EUR" | "IRR";
  grossRevenueCents: number;
  platformFeeCents: number;
  artistPayoutCents: number;
}

export interface AdminOverviewApi {
  periodStart: string;
  periodEnd: string;
  accounting: {
    recordCount: number;
    artistCount: number;
    uniqueListeners: number;
    streams: number;
    pendingPayments: number;
    settledPayments: number;
    currencyBreakdown: CurrencyBreakdownApi[];
  };
  artists: {
    approved: number;
    pendingApplications: number;
  };
  subscriptions: {
    distribution: {
      basic: number;
      silver: number;
      gold: number;
      total: number;
    };
    sales: {
      transactionCount: number;
      currencyBreakdown: Array<{
        currency: "USD" | "EUR" | "IRR";
        revenueCents: number;
        transactionCount: number;
      }>;
      tierBreakdown: Array<{
        tier: "silver" | "gold";
        revenueCents: number;
        transactionCount: number;
      }>;
    };
  };
  support: SupportOverviewApi;
  generatedAt: string;
}

export interface ArtistOverviewApi {
  periodStart: string;
  periodEnd: string;
  artistId: string;
  artistName: string;
  recordCount: number;
  uniqueListeners: number;
  streams: number;
  pendingPayments: number;
  settledPayments: number;
  currencyBreakdown: CurrencyBreakdownApi[];
  trackRevenueBreakdown: TrackRevenueBreakdownApi[];
  generatedAt: string;
}

export interface TrackRevenueBreakdownApi {
  trackId: string;
  trackTitle: string;
  currency?: "USD" | "EUR" | "IRR";
  streamCount: number;
  uniqueListeners: number;
  grossRevenueCents?: number;
  platformFeeCents?: number;
  netRevenueCents: number;
}
