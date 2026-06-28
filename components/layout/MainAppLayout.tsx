"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { BottomPlayer } from "@/components/layout/BottomPlayer";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui";
import { canAccessRoute } from "@/lib/permissions";
import { getPostLoginPath } from "@/lib/auth";
import { useAuth } from "@/providers/AuthProvider";

export function MainAppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isAuthReady } = useAuth();

  useEffect(() => {
    if (isAuthReady && !currentUser) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [currentUser, isAuthReady, pathname, router]);

  if (!isAuthReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-900 px-4 text-slate-300">
        Loading account...
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-900 px-4">
        <section className="w-full max-w-md rounded-lg border border-surface-700 bg-surface-800 p-6 text-center">
          <h1 className="text-xl font-semibold text-slate-50">Sign in required</h1>
          <p className="mt-2 text-sm text-slate-400">Please log in before opening this part of SoundWave.</p>
          <Button className="mt-5" onClick={() => router.push("/login")} type="button">
            Go to login
          </Button>
        </section>
      </main>
    );
  }

  if (!canAccessRoute(currentUser, pathname)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-900 px-4">
        <section className="w-full max-w-md rounded-lg border border-surface-700 bg-surface-800 p-6 text-center">
          <h1 className="text-xl font-semibold text-slate-50">Access denied</h1>
          <p className="mt-2 text-sm text-slate-400">Your current role does not have access to this page.</p>
          <Button className="mt-5" onClick={() => router.push(getPostLoginPath(currentUser))} type="button">
            Go to your home
          </Button>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-surface-900 text-slate-50">
      <div className="flex min-h-screen pb-24">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Topbar />
          <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
        </div>
      </div>
      <BottomPlayer />
    </div>
  );
}
