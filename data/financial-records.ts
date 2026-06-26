import type { ArtistRevenueRecord } from "@/types/domain";

export const artistRevenueRecords: ArtistRevenueRecord[] = [
  {
    id: "revenue-lina-2026-05",
    artistId: "artist-lina",
    periodStart: "2026-05-01T00:00:00.000Z",
    periodEnd: "2026-05-31T23:59:59.000Z",
    streamCount: 842300,
    grossRevenueCents: 421150,
    platformFeeCents: 84230,
    netRevenueCents: 336920,
    currency: "USD"
  },
  {
    id: "revenue-orbit-2026-05",
    artistId: "artist-orbit",
    periodStart: "2026-05-01T00:00:00.000Z",
    periodEnd: "2026-05-31T23:59:59.000Z",
    streamCount: 9100,
    grossRevenueCents: 4550,
    platformFeeCents: 910,
    netRevenueCents: 3640,
    currency: "USD"
  }
];

