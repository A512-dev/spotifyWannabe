"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useUserPreferences } from "@/providers";

interface AuthLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthLayout({ children, description, title }: AuthLayoutProps) {
  const { preferences, setPreferences, t } = useUserPreferences();
  const nextLanguage = preferences.language === "fa" ? "en" : "fa";

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-900 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-surface-700 bg-surface-800 p-6">
        <div className="flex items-center justify-between gap-3">
          <Link className="text-xl font-semibold text-brand-500" href="/">SoundWave</Link>
          <button
            aria-label={t(nextLanguage === "fa" ? "Switch to Persian" : "Switch to English")}
            className="rounded-md border border-surface-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-surface-700 hover:text-white"
            lang={nextLanguage}
            onClick={() => setPreferences({ ...preferences, language: nextLanguage })}
            type="button"
          >
            {nextLanguage === "fa" ? "فارسی" : "English"}
          </button>
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-slate-50">{title}</h1>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}

