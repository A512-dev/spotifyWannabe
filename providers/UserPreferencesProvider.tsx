"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { accountApi, type PreferenceResponse } from "@/features/account/api";
import { getStoredLanguage, LANGUAGE_STORAGE_KEY, localeForLanguage, translate } from "@/lib/i18n";
import { useAuth } from "@/providers/AuthProvider";

export const DEFAULT_USER_PREFERENCES: PreferenceResponse = {
  language: "en",
  systemSoundEnabled: true,
  notificationsEnabled: true,
  subscriptionNotifications: true,
  followedArtistNotifications: true,
  supportNotifications: true,
};

interface UserPreferencesContextValue {
  preferences: PreferenceResponse;
  setPreferences: (value: PreferenceResponse) => void;
  setLanguage: (language: PreferenceResponse["language"]) => void;
  refreshPreferences: () => Promise<void>;
  locale: string;
  t: (label: string, values?: Record<string, string | number>) => string;
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | undefined>(undefined);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [preferences, setPreferencesState] = useState<PreferenceResponse>(() => ({
    ...DEFAULT_USER_PREFERENCES,
    language: getStoredLanguage()
  }));
  const preferenceRevision = useRef(0);

  const setPreferences = useCallback((value: PreferenceResponse) => {
    preferenceRevision.current += 1;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, value.language);
    setPreferencesState(value);
  }, []);

  const refreshPreferences = useCallback(async () => {
    if (!currentUser) {
      setPreferencesState((current) => ({ ...DEFAULT_USER_PREFERENCES, language: current.language }));
      return;
    }
    const requestRevision = preferenceRevision.current;
    const remotePreferences = await accountApi.getPreferences();
    if (requestRevision === preferenceRevision.current) {
      setPreferencesState(remotePreferences);
    }
  }, [currentUser]);

  useEffect(() => {
    void refreshPreferences().catch(() => undefined);
  }, [refreshPreferences]);

  const setLanguage = useCallback((language: PreferenceResponse["language"]) => {
    preferenceRevision.current += 1;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    setPreferencesState((current) => ({ ...current, language }));
    if (currentUser) {
      void accountApi.updatePreferences({ language }).catch(() => undefined);
    }
  }, [currentUser]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = preferences.language;
    root.dir = preferences.language === "fa" ? "rtl" : "ltr";
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, preferences.language);
  }, [preferences.language]);

  useEffect(() => {
    if (!preferences.systemSoundEnabled) return;
    const playClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("button, a[href]")) return;
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 620;
      gain.gain.setValueAtTime(0.018, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.035);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.04);
      oscillator.addEventListener("ended", () => void context.close(), { once: true });
    };
    document.addEventListener("click", playClick, true);
    return () => document.removeEventListener("click", playClick, true);
  }, [preferences.systemSoundEnabled]);

  const locale = localeForLanguage(preferences.language);
  const t = useCallback(
    (label: string, values?: Record<string, string | number>) => translate(preferences.language, label, values),
    [preferences.language]
  );
  const value = useMemo(() => ({ preferences, setPreferences, setLanguage, refreshPreferences, locale, t }), [preferences, setPreferences, setLanguage, refreshPreferences, locale, t]);
  return <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>;
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (!context) throw new Error("useUserPreferences must be used inside UserPreferencesProvider.");
  return context;
}
