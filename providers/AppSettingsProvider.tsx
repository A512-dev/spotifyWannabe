"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { APP_SETTINGS } from "@/constants/app";
import type { AppSettings } from "@/types/domain";

interface AppSettingsContextValue {
  /** Current editable snapshot of application-wide settings. */
  settings: AppSettings;
  /** Replaces the whole snapshot; admin forms build the next complete object. */
  setSettings: (settings: AppSettings) => void;
}

// Undefined is intentional: it lets the hook detect a missing provider.
const AppSettingsContext = createContext<AppSettingsContextValue | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  // Context lets admin pages preview changes globally before an API exists.
  const [settings, setSettings] = useState<AppSettings>(APP_SETTINGS);

  // Stable object identity prevents consumers from rerendering for unrelated
  // parent renders when the settings object itself has not changed.
  const value = useMemo(
    () => ({
      settings,
      setSettings
    }),
    [settings]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);

  if (!context) {
    // Fail loudly during development instead of producing a later undefined error.
    throw new Error("useAppSettings must be used inside AppSettingsProvider.");
  }

  return context;
}
