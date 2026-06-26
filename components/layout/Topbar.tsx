"use client";

import Link from "next/link";
import { ACCOUNT_NAVIGATION } from "@/config/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { filterNavigationForUser } from "@/lib/permissions";
import { getRoleLabel, getSubscriptionLabel } from "@/lib/labels";
import { useAuth } from "@/providers/AuthProvider";

export function Topbar() {
  const { currentUser } = useAuth();
  const accountLinks = filterNavigationForUser(ACCOUNT_NAVIGATION, currentUser);

  return (
    <header className="sticky top-0 z-20 border-b border-surface-700 bg-surface-900/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-400">Signed in as</p>
          <p className="truncate font-medium text-slate-50">{currentUser.displayName}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden gap-2 sm:flex">
            <Badge>{getRoleLabel(currentUser.role)}</Badge>
            <Badge tone="success">{getSubscriptionLabel(currentUser.subscriptionTier)}</Badge>
          </div>
          <nav className="hidden items-center gap-3 text-sm text-slate-300 lg:flex">
            {accountLinks.map((item) => (
              <Link className="hover:text-slate-50" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <Avatar name={currentUser.displayName} src={currentUser.avatarUrl} />
        </div>
      </div>
    </header>
  );
}

