import type { ArtistApprovalRequest } from "@/types/domain";

export const artistApprovalRequests: ArtistApprovalRequest[] = [
  {
    id: "artist-approval-1",
    artistProfileId: "artist-orbit",
    requestedByUserId: "user-listener-2",
    status: "pending",
    submittedAt: "2026-06-12T15:00:00.000Z"
  },
  {
    id: "artist-approval-2",
    artistProfileId: "artist-lina",
    requestedByUserId: "user-artist-1",
    status: "approved",
    submittedAt: "2025-02-12T10:00:00.000Z",
    reviewedByUserId: "user-admin-1",
    reviewedAt: "2025-02-18T12:00:00.000Z",
    reviewNote: "Strong profile and verified release metadata."
  }
];

