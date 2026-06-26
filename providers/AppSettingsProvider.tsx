"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { APP_SETTINGS } from "@/constants/app";
import type { AppSettings } from "@/types/domain";

interface AppSettingsContextValue {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
}

const AppSettingsContext = createContext<AppSettingsContextValue | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  // Keeping settings in context lets admin pages preview changes before an API exists.
  const [settings, setSettings] = useState<AppSettings>(APP_SETTINGS);

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
    throw new Error("useAppSettings must be used inside AppSettingsProvider.");
  }

  return context;
}

