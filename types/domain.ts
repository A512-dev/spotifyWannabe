/**
 * Shared domain model for SoundWave.
 *
 * Pages, providers, mock data, and reusable components all import these definitions,
 * which makes this file the application's common vocabulary. Keeping the model here
 * prevents each feature from inventing a different shape for the same entity.
 *
 * The contracts are deliberately backend-friendly: identifiers are opaque strings,
 * timestamps are serialized ISO strings, and optional fields model incomplete records.
 */

/** The four account types supported by role-based navigation and route access. */
export type UserRole = "listener" | "artist" | "support" | "admin";

/** Optional demographic value collected during listener registration. */
export type Gender = "female" | "male" | "other" | "prefer_not_to_say";

/** Product plan used to determine playlist and premium-feature limits. */
export type SubscriptionTier = "basic" | "silver" | "gold";

/** Documents intent at call sites while remaining compatible with JSON strings. */
export type ISODateString = string;

/** Lifecycle shared by artist profiles and artist approval requests. */
export type ApprovalStatus = "pending" | "approved" | "rejected";

/** Support tickets move through these user-visible workflow states. */
export type TicketStatus = "open" | "waiting_for_user" | "resolved" | "closed";

/** Priority controls how prominently a support ticket is surfaced. */
export type TicketPriority = "low" | "medium" | "high" | "urgent";

/** Categories used to label and filter account notifications. */
export type NotificationType =
  | "system"
  | "playlist"
  | "artist"
  | "billing"
  | "support";

export interface User {
  /** Stable primary key used by all records that refer to an account. */
  id: string;
  /** URL-friendly public handle; older or incomplete accounts may not have one. */
  username?: string;
  /** Human-readable name displayed in navigation and profiles. */
  displayName: string;
  /** Login identity; authentication compares it case-insensitively. */
  email: string;
  /** Controls route access and role-specific navigation. */
  role: UserRole;
  /** Controls subscription-gated product features. */
  subscriptionTier: SubscriptionTier;
  /** Optional registration/profile information stored as ISO values. */
  birthDate?: ISODateString;
  gender?: Gender;
  /** Public asset path or external URL rendered by the Avatar component. */
  avatarUrl?: string;
  /** Connects an artist account to its public ArtistProfile. */
  artistProfileId?: string;
  /** Audit timestamps retained as strings so the records serialize cleanly. */
  createdAt: ISODateString;
  lastActiveAt: ISODateString;
  /** Phase 1 displays this state but does not implement email verification. */
  isEmailVerified: boolean;
}

/** Public-facing artist identity and aggregate audience statistics. */
export interface ArtistProfile {
  /** Artist-profile key referenced by tracks, albums, and revenue records. */
  id: string;
  /** Account that owns and manages this artist identity. */
  userId: string;
  stageName: string;
  bio: string;
  /** Search/display tags; one artist may belong to several genres. */
  genreTags: string[];
  /** Cached aggregate metrics used by catalog and dashboard screens. */
  monthlyListeners: number;
  followerCount: number;
  /** Only approved artists may manage releases in the dashboard. */
  approvalStatus: ApprovalStatus;
  verifiedAt?: ISODateString;
  /** Optional artwork lets the UI render graceful placeholders. */
  profileImageUrl?: string;
  bannerImageUrl?: string;
}

/** A playable audio item and the metadata needed by the catalog and player. */
export interface Track {
  id: string;
  title: string;
  /** Foreign key to ArtistProfile. */
  artistId: string;
  /** Optional because singles may exist outside an album. */
  albumId?: string;
  /** Used by progress controls and m:ss formatting. */
  durationSeconds: number;
  /** Browser-loadable URL; mock records point into public/mock/audio. */
  audioUrl: string;
  coverImageUrl?: string;
  /** Aggregate stream count displayed in catalog and premium player UI. */
  playCount: number;
  explicit: boolean;
  releaseDate: ISODateString;
  /** Optional multiline text displayed by desktop and mobile lyric panels. */
  lyrics?: string;
}

/** A release that groups an ordered list of tracks under shared artwork. */
export interface Album {
  id: string;
  title: string;
  artistId: string;
  coverImageUrl?: string;
  releaseDate: ISODateString;
  /** Track IDs preserve album order without duplicating full Track objects. */
  trackIds: string[];
}

/**
 * Normalized playlist membership record.
 * The current UI mainly uses Playlist.itemIds, but this model is ready for a
 * backend where membership metadata and ordering live in their own table.
 */
export interface PlaylistItem {
  id: string;
  playlistId: string;
  trackId: string;
  addedByUserId: string;
  addedAt: ISODateString;
  sortOrder: number;
}

export interface Playlist {
  id: string;
  /** User allowed to edit/delete this playlist. */
  ownerId: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  /** Determines whether other users may discover the playlist. */
  isPublic: boolean;
  /** Ordered track IDs used directly as a playback queue. */
  itemIds: string[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Notification {
  id: string;
  /** Account whose inbox receives this record. */
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Missing readAt means the notification is unread. */
  readAt?: ISODateString;
  createdAt: ISODateString;
  /** Optional destination used by the card's Open action. */
  actionHref?: string;
}

/** Header/workflow record for a customer-support conversation. */
export interface Ticket {
  id: string;
  requesterId: string;
  /** May be absent while a ticket is still unassigned. */
  assignedSupportUserId?: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** One user-visible reply or staff-only note attached to a support ticket. */
export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  body: string;
  /** Internal notes are visible to staff, not the requester. */
  isInternalNote: boolean;
  createdAt: ISODateString;
}

/** Auditable request to approve or reject an artist identity. */
export interface ArtistApprovalRequest {
  id: string;
  artistProfileId: string;
  requestedByUserId: string;
  status: ApprovalStatus;
  submittedAt: ISODateString;
  /** Review fields are absent until a staff member acts on the request. */
  reviewedByUserId?: string;
  reviewedAt?: ISODateString;
  reviewNote?: string;
}

/** Monthly artist payout calculation represented in integer cents. */
export interface ArtistRevenueRecord {
  id: string;
  artistId: string;
  periodStart: ISODateString;
  periodEnd: ISODateString;
  streamCount: number;
  /** Cent values avoid floating-point errors in financial calculations. */
  grossRevenueCents: number;
  platformFeeCents: number;
  netRevenueCents: number;
  currency: "USD" | "EUR" | "IRR";
}

/** Pricing and feature entitlements for one subscription plan. */
export interface SubscriptionPrice {
  tier: SubscriptionTier;
  monthlyPriceCents: number;
  annualPriceCents: number;
  currency: "USD" | "EUR" | "IRR";
  /** Infinity represents an unlimited playlist allowance in the mock client. */
  playlistLimit: number;
  supportsOfflineMode: boolean;
  supportsAdvancedStats: boolean;
}

/** Globally editable product settings surfaced by the admin dashboard. */
export interface AppSettings {
  appName: string;
  supportEmail: string;
  allowArtistApplications: boolean;
  maintenanceMode: boolean;
  defaultSubscriptionTier: SubscriptionTier;
}

/** Shared UI/audio state for the persistent bottom player. */
export interface PlayerState {
  /** Missing when no catalog item has been selected. */
  currentTrackId?: string;
  /** Ordered IDs used by next/previous controls. */
  queueTrackIds: string[];
  isPlaying: boolean;
  /** Integer percentage in the inclusive range 0–100. */
  volume: number;
  repeatMode: "off" | "one" | "all";
  shuffleEnabled: boolean;
}
