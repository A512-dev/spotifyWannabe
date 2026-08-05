"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { accountApi, type PreferenceResponse } from "@/features/account/api";
import { useAuth } from "@/providers/AuthProvider";

export const DEFAULT_USER_PREFERENCES: PreferenceResponse = {
  language: "en",
  systemSoundEnabled: true,
  notificationsEnabled: true,
  subscriptionNotifications: true,
  followedArtistNotifications: true,
  supportNotifications: true,
};

const persianLabels: Record<string, string> = {
  Home: "خانه",
  Music: "موسیقی",
  Playlists: "فهرست‌های پخش",
  "Artist Dashboard": "داشبورد هنرمند",
  Support: "پشتیبانی",
  Admin: "مدیریت",
  Profile: "نمایه",
  Notifications: "اعلان‌ها",
  Settings: "تنظیمات",
  Preferences: "ترجیحات",
  Language: "زبان",
  English: "انگلیسی",
  Persian: "فارسی",
  "System sounds": "صداهای سامانه",
  "Enable notifications": "فعال‌سازی اعلان‌ها",
  "Subscription expiry notifications": "اعلان‌های پایان اشتراک",
  "Followed artist releases": "انتشارهای هنرمندان دنبال‌شده",
  "Support ticket notifications": "اعلان‌های تیکت پشتیبانی",
  "Save preferences": "ذخیرهٔ ترجیحات",
  "Saving...": "در حال ذخیره...",
  Subscription: "اشتراک",
  Plan: "طرح",
  "Billing period": "دورهٔ پرداخت",
  "Continue to payment": "ادامه به پرداخت",
  "Danger zone": "ناحیهٔ خطر",
  "Delete account": "حذف حساب",
  "Main navigation": "ناوبری اصلی",
  Workspace: "فضای کاری",
  Account: "حساب کاربری",
  "Session Active": "نشست فعال",
  "Log out": "خروج",
  "Loading account...": "در حال بارگذاری حساب...",
  "Sign in required": "ورود لازم است",
  "Access denied": "دسترسی مجاز نیست",
};

interface UserPreferencesContextValue {
  preferences: PreferenceResponse;
  setPreferences: (value: PreferenceResponse) => void;
  refreshPreferences: () => Promise<void>;
  t: (label: string) => string;
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | undefined>(undefined);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [preferences, setPreferences] = useState(DEFAULT_USER_PREFERENCES);

  const refreshPreferences = useCallback(async () => {
    if (!currentUser) {
      setPreferences(DEFAULT_USER_PREFERENCES);
      return;
    }
    setPreferences(await accountApi.getPreferences());
  }, [currentUser]);

  useEffect(() => {
    void refreshPreferences().catch(() => setPreferences(DEFAULT_USER_PREFERENCES));
  }, [refreshPreferences]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = preferences.language;
    root.dir = preferences.language === "fa" ? "rtl" : "ltr";
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

  const t = useCallback((label: string) => preferences.language === "fa" ? (persianLabels[label] ?? label) : label, [preferences.language]);
  const value = useMemo(() => ({ preferences, setPreferences, refreshPreferences, t }), [preferences, refreshPreferences, t]);
  return <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>;
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (!context) throw new Error("useUserPreferences must be used inside UserPreferencesProvider.");
  return context;
}
