"use client";

import type { ReactNode } from "react";
import { AppSettingsProvider } from "@/providers/AppSettingsProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { PlayerProvider } from "@/providers/PlayerProvider";
import { UserPreferencesProvider } from "@/providers/UserPreferencesProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppSettingsProvider>
      <AuthProvider>
        <UserPreferencesProvider>
          <PlayerProvider>{children}</PlayerProvider>
        </UserPreferencesProvider>
      </AuthProvider>
    </AppSettingsProvider>
  );
}
