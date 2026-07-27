import type { NavigationItem } from "@/types/navigation";

// Main product destinations. Sidebar filters this list against the current role,
// so adding a route here does not expose it to every account automatically.
export const SIDEBAR_NAVIGATION: NavigationItem[] = [
  {
    label: "Home",
    href: "/",
    description: "Listener landing area and recommendations.",
    allowedRoles: ["listener", "artist", "support", "admin"]
  },
  {
    label: "Music",
    href: "/music",
    description: "Browse albums, tracks, artists, and search results.",
    allowedRoles: ["listener", "artist", "support", "admin"]
  },
  {
    label: "Playlists",
    href: "/playlists",
    description: "Create and manage personal playlists.",
    allowedRoles: ["listener", "artist", "support", "admin"]
  },
  {
    label: "Artist Dashboard",
    href: "/artist-dashboard",
    description: "Artist uploads, stats, and revenue overview.",
    allowedRoles: ["artist", "admin"]
  },
  {
    label: "Support",
    href: "/support",
    description: "Support ticket workspace.",
    allowedRoles: ["support", "admin"]
  },
  {
    label: "Admin",
    href: "/admin",
    description: "Administrative settings and approvals.",
    allowedRoles: ["admin"]
  }
];

// Secondary account links rendered in the authenticated top bar.
export const ACCOUNT_NAVIGATION: NavigationItem[] = [
  {
    label: "Profile",
    href: "/profile",
    allowedRoles: ["listener", "artist", "support", "admin"]
  },
  {
    label: "Notifications",
    href: "/notifications",
    allowedRoles: ["listener", "artist", "support", "admin"]
  },
  {
    label: "Settings",
    href: "/settings",
    allowedRoles: ["listener", "artist", "support", "admin"]
  }
];

// Public authentication destinations, ready for any shared auth navigation.
export const AUTH_NAVIGATION: NavigationItem[] = [
  {
    label: "Login",
    href: "/login",
    allowedRoles: ["listener", "artist", "support", "admin"]
  },
  {
    label: "Sign up",
    href: "/signup",
    allowedRoles: ["listener", "artist", "support", "admin"]
  }
];
