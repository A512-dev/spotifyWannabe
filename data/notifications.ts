import type { Notification } from "@/types/domain";

export const notifications: Notification[] = [
  {
    id: "notification-listener-subscription",
    userId: "user-listener-1",
    type: "billing",
    title: "Subscription renewal reminder",
    message: "Your Gold subscription renews soon. Review your plan from settings if you want to make changes.",
    createdAt: "2026-06-24T09:30:00.000Z",
    actionHref: "/settings"
  },
  {
    id: "notification-listener-release",
    userId: "user-listener-1",
    type: "artist",
    title: "New release from Lina Torres",
    message: "After Midnight has new tracks available from an artist you follow.",
    readAt: "2026-06-22T11:15:00.000Z",
    createdAt: "2026-06-22T08:10:00.000Z",
    actionHref: "/music/album/album-after-midnight"
  },
  {
    id: "notification-basic-release",
    userId: "user-listener-2",
    type: "artist",
    title: "New jazz-fusion single",
    message: "The Orbit Room released Blue Spiral. Open the track from the music catalog.",
    createdAt: "2026-06-23T15:20:00.000Z",
    actionHref: "/artist/artist-orbit"
  },
  {
    id: "notification-artist-approved",
    userId: "user-artist-1",
    type: "artist",
    title: "Artist account approved",
    message: "Your artist identity was approved after portfolio review.",
    readAt: "2026-06-10T14:00:00.000Z",
    createdAt: "2026-06-10T12:45:00.000Z",
    actionHref: "/artist-dashboard"
  },
  {
    id: "notification-artist-finance",
    userId: "user-artist-1",
    type: "billing",
    title: "Monthly finance summary ready",
    message: "Your May stream count and revenue calculation are ready to review.",
    createdAt: "2026-06-15T08:00:00.000Z",
    actionHref: "/artist-dashboard"
  },
  {
    id: "notification-support-ticket",
    userId: "user-support-1",
    type: "support",
    title: "New user ticket",
    message: "A high-priority user ticket was added to the support queue.",
    createdAt: "2026-06-25T10:40:00.000Z",
    actionHref: "/support"
  },
  {
    id: "notification-support-artist-request",
    userId: "user-support-1",
    type: "artist",
    title: "Artist verification request",
    message: "A newly registered artist is waiting for identity review.",
    readAt: "2026-06-25T12:30:00.000Z",
    createdAt: "2026-06-25T09:00:00.000Z",
    actionHref: "/support"
  },
  {
    id: "notification-admin-ticket",
    userId: "user-admin-1",
    type: "support",
    title: "Support queue needs review",
    message: "There are new user tickets waiting for triage.",
    createdAt: "2026-06-25T11:00:00.000Z",
    actionHref: "/support"
  },
  {
    id: "notification-admin-approvals",
    userId: "user-admin-1",
    type: "system",
    title: "Artist approvals pending",
    message: "There is 1 pending artist approval request.",
    readAt: "2026-06-18T12:00:00.000Z",
    createdAt: "2026-06-18T10:00:00.000Z",
    actionHref: "/admin"
  }
];
