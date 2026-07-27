import type { AppSettings } from "@/types/domain";

// These are the initial in-memory settings supplied to AppSettingsProvider.
// Admin edits affect the current browser session; no backend persists them yet.
export const APP_SETTINGS: AppSettings = {
  appName: "SoundWave",
  supportEmail: "support@soundwave.example",
  allowArtistApplications: true,
  maintenanceMode: false,
  defaultSubscriptionTier: "basic"
};

// This map is documentation, not authorization logic. It records intended
// ownership boundaries so parallel feature work produces fewer merge conflicts.
export const FEATURE_OWNERSHIP = {
  account: "Developer 1: auth, profile, settings, notifications",
  music: "Developer 2: music library, playlists, playback experience",
  operations: "Developer 3: artist dashboard, support tools, admin dashboard"
} as const;
