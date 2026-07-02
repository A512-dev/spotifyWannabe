import type { User } from "@/types/domain";

// Mock users intentionally cover every role and subscription tier.
export const users: User[] = [
  {
    id: "user-listener-1",
    displayName: "Maya Stone",
    email: "maya.listener@example.com",
    role: "listener",
    subscriptionTier: "gold",
    avatarUrl: "/mock/avatars/maya.png",
    createdAt: "2025-01-10T09:00:00.000Z",
    lastActiveAt: "2026-06-25T12:30:00.000Z",
    isEmailVerified: true
  },
  {
    id: "user-listener-2",
    displayName: "Noah Reed",
    email: "noah.basic@example.com",
    role: "listener",
    subscriptionTier: "basic",
    avatarUrl: "/mock/avatars/noah.png",
    createdAt: "2025-04-12T10:00:00.000Z",
    lastActiveAt: "2026-06-20T14:20:00.000Z",
    isEmailVerified: false
  },
  {
    id: "user-artist-1",
    displayName: "Lina Torres",
    email: "lina.artist@example.com",
    role: "artist",
    subscriptionTier: "silver",
    artistProfileId: "artist-lina",
    avatarUrl: "/mock/avatars/lina.png",
    createdAt: "2024-09-15T11:00:00.000Z",
    lastActiveAt: "2026-06-24T17:45:00.000Z",
    isEmailVerified: true
  },
  {
    id: "user-support-1",
    displayName: "Samir Patel",
    email: "samir.support@example.com",
    role: "support",
    subscriptionTier: "basic",
    avatarUrl: "/mock/avatars/samir.png",
    createdAt: "2024-02-03T08:30:00.000Z",
    lastActiveAt: "2026-06-26T07:15:00.000Z",
    isEmailVerified: true
  },
  {
    id: "user-admin-1",
    displayName: "Elena Park",
    email: "elena.admin@example.com",
    role: "admin",
    subscriptionTier: "gold",
    avatarUrl: "/mock/avatars/elena.png",
    createdAt: "2023-11-01T07:00:00.000Z",
    lastActiveAt: "2026-06-26T08:00:00.000Z",
    isEmailVerified: true
  }
];
