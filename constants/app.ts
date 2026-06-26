import type { AppSettings } from "@/types/domain";

// Mock app settings are editable later from the admin area.
export const APP_SETTINGS: AppSettings = {
  appName: "SoundWave",
  supportEmail: "support@soundwave.example",
  allowArtistApplications: true,
  maintenanceMode: false,
  defaultSubscriptionTier: "basic"
};

// Route owners document how a 3-person team can split future work with low conflicts.
export const FEATURE_OWNERSHIP = {
  account: "Developer 1: auth, profile, settings, notifications",
  music: "Developer 2: music library, playlists, playback experience",
  operations: "Developer 3: artist dashboard, support tools, admin dashboard"
} as const;

