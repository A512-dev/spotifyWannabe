import type { ReactNode } from "react";
import { BottomPlayer } from "@/components/layout/BottomPlayer";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export function MainAppLayout({ children }: { children: ReactNode }) {
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

