import type { Notification } from "@/types/domain";

export const notifications: Notification[] = [
  {
    id: "notification-1",
    userId: "user-listener-1",
    type: "playlist",
    title: "Playlist limit updated",
    message: "Gold members can now create up to 100 playlists.",
    createdAt: "2026-06-20T09:30:00.000Z",
    actionHref: "/playlists"
  },
  {
    id: "notification-2",
    userId: "user-artist-1",
    type: "artist",
    title: "Monthly report is ready",
    message: "Your latest streams and revenue summary can be reviewed.",
    createdAt: "2026-06-15T08:00:00.000Z",
    actionHref: "/artist-dashboard"
  },
  {
    id: "notification-3",
    userId: "user-admin-1",
    type: "system",
    title: "Artist approvals pending",
    message: "There is 1 pending artist approval request.",
    readAt: "2026-06-18T12:00:00.000Z",
    createdAt: "2026-06-18T10:00:00.000Z",
    actionHref: "/admin"
  }
];

