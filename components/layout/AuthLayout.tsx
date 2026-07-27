import Link from "next/link";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  /** Page-specific heading/copy and form content inside a shared auth shell. */
  title: string;
  description: string;
  children: ReactNode;
}

/** Centered, narrow layout shared by login, signup, and password recovery. */
export function AuthLayout({ children, description, title }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-900 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-surface-700 bg-surface-800 p-6">
        {/* Brand link gives users a consistent escape back to the app root. */}
        <Link className="text-xl font-semibold text-brand-500" href="/">
          SoundWave
        </Link>
        <h1 className="mt-6 text-2xl font-semibold text-slate-50">{title}</h1>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}
