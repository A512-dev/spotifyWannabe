"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SIDEBAR_NAVIGATION } from "@/config/navigation";
import { filterNavigationForUser } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";

export function Sidebar() {
  const pathname = usePathname();
  const { currentUser } = useAuth();
  if (!currentUser) {
    return null;
  }

  const navigation = filterNavigationForUser(SIDEBAR_NAVIGATION, currentUser);

  return (
    <aside className="hidden w-64 shrink-0 border-r border-surface-700 bg-surface-900 p-4 md:block">
      <Link className="block text-xl font-semibold text-slate-50" href="/">
        SoundWave
      </Link>
      <nav className="mt-8 space-y-1">
        {navigation.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              className={cn(
                "block rounded-md px-3 py-2 text-sm transition",
                active ? "bg-surface-700 text-slate-50" : "text-slate-400 hover:bg-surface-800 hover:text-slate-100"
              )}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
