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

  // ۱. حالت بارگذاری با پس‌زمینه لایت و متن بنفش تیره
  if (!isAuthReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-light px-4 text-brand-primary">
        Loading account...
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-light px-4">
        <section className="w-full max-w-md rounded-lg border border-brand-secondary/30 bg-white p-6 text-center shadow-md">
          <h1 className="text-xl font-semibold text-brand-primary">Sign in required</h1>
          <p className="mt-2 text-sm text-brand-primary/80">Please log in before opening this part of SoundWave.</p>
          <Button className="mt-5 bg-brand-primary hover:bg-brand-secondary text-white" onClick={() => router.push("/login")} type="button">
            Go to login
          </Button>
        </section>
      </main>
    );
  }

  if (!canAccessRoute(currentUser, pathname)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-light px-4">
        <section className="w-full max-w-md rounded-lg border border-brand-secondary/30 bg-white p-6 text-center shadow-md">
          <h1 className="text-xl font-semibold text-brand-primary">Access denied</h1>
          <p className="mt-2 text-sm text-brand-primary/80">Your current role does not have access to this page.</p>
          <Button className="mt-5 bg-brand-primary hover:bg-brand-secondary text-white" onClick={() => router.push(getPostLoginPath(currentUser))} type="button">
            Go to your home
          </Button>
        </section>
      </main>
    );
  }

  return (
  <div className="min-h-screen bg-brand-bgDark text-white"> 
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