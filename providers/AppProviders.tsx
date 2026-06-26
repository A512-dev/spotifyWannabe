"use client";

import type { ReactNode } from "react";
import { AppSettingsProvider } from "@/providers/AppSettingsProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { PlayerProvider } from "@/providers/PlayerProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppSettingsProvider>
      <AuthProvider>
        <PlayerProvider>{children}</PlayerProvider>
      </AuthProvider>
    </AppSettingsProvider>
  );
}

