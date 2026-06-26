// Shared domain types live here so feature teams can agree on the same data shapes.
// Keep these interfaces backend-friendly: IDs are strings and dates are ISO strings.

export type UserRole = "listener" | "artist" | "support" | "admin";

export type SubscriptionTier = "basic" | "silver" | "gold";

export type ISODateString = string;

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type TicketStatus = "open" | "waiting_for_user" | "resolved" | "closed";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type NotificationType =
  | "system"
  | "playlist"
  | "artist"
  | "billing"
  | "support";

export interface User {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
  avatarUrl?: string;
  artistProfileId?: string;
  createdAt: ISODateString;
  lastActiveAt: ISODateString;
  isEmailVerified: boolean;
}

export interface ArtistProfile {
  id: string;
  userId: string;
  stageName: string;
  bio: string;
  genreTags: string[];
  monthlyListeners: number;
  followerCount: number;
  approvalStatus: ApprovalStatus;
  verifiedAt?: ISODateString;
  profileImageUrl?: string;
  bannerImageUrl?: string;
}

export interface Track {
  id: string;
  title: string;
  artistId: string;
  albumId?: string;
  durationSeconds: number;
  audioUrl: string;
  coverImageUrl?: string;
  playCount: number;
  explicit: boolean;
  releaseDate: ISODateString;
}

export interface Album {
  id: string;
  title: string;
  artistId: string;
  coverImageUrl?: string;
  releaseDate: ISODateString;
  trackIds: string[];
}

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
  ownerId: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  isPublic: boolean;
  itemIds: string[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt?: ISODateString;
  createdAt: ISODateString;
  actionHref?: string;
}

export interface Ticket {
  id: string;
  requesterId: string;
  assignedSupportUserId?: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  body: string;
  isInternalNote: boolean;
  createdAt: ISODateString;
}

export interface ArtistApprovalRequest {
  id: string;
  artistProfileId: string;
  requestedByUserId: string;
  status: ApprovalStatus;
  submittedAt: ISODateString;
  reviewedByUserId?: string;
  reviewedAt?: ISODateString;
  reviewNote?: string;
}

export interface ArtistRevenueRecord {
  id: string;
  artistId: string;
  periodStart: ISODateString;
  periodEnd: ISODateString;
  streamCount: number;
  grossRevenueCents: number;
  platformFeeCents: number;
  netRevenueCents: number;
  currency: "USD" | "EUR" | "IRR";
}

export interface SubscriptionPrice {
  tier: SubscriptionTier;
  monthlyPriceCents: number;
  annualPriceCents: number;
  currency: "USD" | "EUR" | "IRR";
  playlistLimit: number;
  supportsOfflineMode: boolean;
  supportsAdvancedStats: boolean;
}

export interface AppSettings {
  appName: string;
  supportEmail: string;
  allowArtistApplications: boolean;
  maintenanceMode: boolean;
  defaultSubscriptionTier: SubscriptionTier;
}

export interface PlayerState {
  currentTrackId?: string;
  queueTrackIds: string[];
  isPlaying: boolean;
  volume: number;
  repeatMode: "off" | "one" | "all";
  shuffleEnabled: boolean;
}

