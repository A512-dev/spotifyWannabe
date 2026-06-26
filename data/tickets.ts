import type { Ticket, TicketMessage } from "@/types/domain";

export const tickets: Ticket[] = [
  {
    id: "ticket-1001",
    requesterId: "user-listener-2",
    assignedSupportUserId: "user-support-1",
    subject: "Cannot update profile image",
    status: "open",
    priority: "medium",
    createdAt: "2026-06-21T13:00:00.000Z",
    updatedAt: "2026-06-22T08:45:00.000Z"
  },
  {
    id: "ticket-1002",
    requesterId: "user-artist-1",
    assignedSupportUserId: "user-support-1",
    subject: "Revenue report looks delayed",
    status: "waiting_for_user",
    priority: "high",
    createdAt: "2026-06-18T11:10:00.000Z",
    updatedAt: "2026-06-19T09:20:00.000Z"
  }
];

export const ticketMessages: TicketMessage[] = [
  {
    id: "ticket-message-1",
    ticketId: "ticket-1001",
    senderId: "user-listener-2",
    body: "I do not see an option to upload a profile image.",
    isInternalNote: false,
    createdAt: "2026-06-21T13:02:00.000Z"
  },
  {
    id: "ticket-message-2",
    ticketId: "ticket-1001",
    senderId: "user-support-1",
    body: "Basic users cannot edit profile images. We should surface this clearly in settings.",
    isInternalNote: true,
    createdAt: "2026-06-22T08:45:00.000Z"
  }
];

