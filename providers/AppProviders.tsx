"use client";

import type { ReactNode } from "react";
import { AppSettingsProvider } from "@/providers/AppSettingsProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { PlayerProvider } from "@/providers/PlayerProvider";

/**
 * Single provider composition point used by the root layout.
 * The nesting means player/auth consumers can also access app settings, while
 * the player can access the authenticated user for tier-aware presentation.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppSettingsProvider>
      <AuthProvider>
        <PlayerProvider>{children}</PlayerProvider>
      </AuthProvider>
    </AppSettingsProvider>
  );
}
