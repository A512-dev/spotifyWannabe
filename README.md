# SoundWave Frontend Foundation

SoundWave is a Phase 1 frontend foundation for a Spotify-like streaming app built with Next.js App Router, React, TypeScript, and Tailwind CSS. This repository intentionally focuses on shared architecture, typed contracts, mock data, reusable UI, layouts, providers, and route skeletons instead of full business-page implementation.

## Architecture

The project is organized so three developers can work asynchronously with minimal file conflicts:

- Developer 1 owns `features/account` and the auth, profile, settings, and notifications routes.
- Developer 2 owns `features/music` and the music catalog, playlists, and player experience.
- Developer 3 owns `features/operations` and the artist dashboard, support workspace, and admin dashboard.

Shared code lives outside feature folders:

- `types` defines scalable domain contracts for users, artists, tracks, albums, playlists, support, admin, subscriptions, app settings, and player state.
- `data` contains centralized mock data that reflects all roles and subscription tiers.
- `components/ui` contains primitive reusable UI components.
- `components/shared` contains product-level reusable components.
- `components/layout` contains auth, main app, dashboard, sidebar, topbar, and player shell components.
- `components/player` contains the Phase 1 player shell, placeholder controls, and track summary pieces.
- `config` centralizes navigation, route access, and subscription feature rules.
- `lib` contains helpers for permissions, subscriptions, labels, formatting, and class names.
- `providers` contains simple mock contexts for auth/current user, app settings, and player UI state.
- `hooks` exposes stable hook entry points for feature teams.

## Folder Structure

```text
app/
  admin/
  artist/[id]/
  artist-dashboard/
  forgot-password/
  login/
  music/
    album/[id]/
  notifications/
  playlists/
  profile/
  settings/
  signup/
  support/
components/
  layout/
  player/
  shared/
  ui/
config/
constants/
data/
features/
  account/
  music/
  operations/
hooks/
lib/
providers/
types/
```

## Implementation Notes

The app uses mock state and mock data for Phase 1. Route skeletons include comments describing where future feature work belongs. Role-aware navigation and subscription rules are centralized so future route guards, middleware, or server-side checks can reuse the same configuration.

Dependency installation and type-checking were skipped after npm stalled in this environment. Run these locally when ready:

```bash
npm install
npm run type-check
npm run dev
```
