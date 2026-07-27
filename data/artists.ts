import type { ArtistProfile } from "@/types/domain";

// Public artist seed records cover both sides of the approval workflow.
export const artists: ArtistProfile[] = [
  // Approved, established artist with complete imagery and catalog data.
  {
    id: "artist-lina",
    userId: "user-artist-1",
    stageName: "Lina Torres",
    bio: "Warm electronic pop with cinematic vocals and late-night synth textures.",
    genreTags: ["Pop", "Electronic", "Synthwave"],
    monthlyListeners: 128400,
    followerCount: 32200,
    approvalStatus: "approved",
    verifiedAt: "2025-02-18T12:00:00.000Z",
    profileImageUrl: "/mock/artists/lina-profile.png",
    bannerImageUrl: "/mock/artists/lina-banner.png"
  },
  // Pending artist used by support/admin approval queues and empty-album states.
  {
    id: "artist-orbit",
    userId: "user-listener-2",
    stageName: "The Orbit Room",
    bio: "Instrumental jazz-fusion project waiting for editorial approval.",
    genreTags: ["Jazz", "Fusion", "Instrumental"],
    monthlyListeners: 2400,
    followerCount: 860,
    approvalStatus: "pending",
    profileImageUrl: "/mock/artists/orbit-profile.png"
  }
];
