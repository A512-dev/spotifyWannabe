"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ACCOUNT_NAVIGATION, SIDEBAR_NAVIGATION } from "@/config/navigation";
import { filterNavigationForUser } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useAuth, useUserPreferences } from "@/providers";
import type { NavigationItem } from "@/types/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const { t } = useUserPreferences();
  if (!currentUser) return null;

  const main = filterNavigationForUser(SIDEBAR_NAVIGATION, currentUser);
  const account = filterNavigationForUser(ACCOUNT_NAVIGATION, currentUser);
  const workspaceHrefs = new Set(["/artist-dashboard", "/support", "/admin"]);
  const primary = main.filter((item) => !workspaceHrefs.has(item.href));
  const workspace = main.filter((item) => workspaceHrefs.has(item.href));
  const mobile = [...main, ...account];

  const links = (items: NavigationItem[]) => items.map((item) => {
    const active = pathname === item.href;
    return <Link className={cn("block rounded-xl px-4 py-2.5 text-sm font-bold transition", active ? "bg-brand-secondary/20 text-brand-secondary" : "text-white/60 hover:bg-white/5 hover:text-white")} href={item.href} key={item.href}>{t(item.label)}</Link>;
  });

  return (
    <>
      <aside className="hidden w-56 shrink-0 bg-[#160926] p-4 shadow-xl md:flex md:flex-col">
        <Link className="mb-7 block px-2 text-2xl font-black text-white" href="/">SoundWave</Link>
        <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-white/30">{t("Main navigation")}</p>
        <nav className="space-y-1">{links(primary)}</nav>
        {workspace.length ? <><p className="mb-2 mt-6 px-2 text-[10px] font-bold uppercase tracking-widest text-white/30">{t("Workspace")}</p><nav className="space-y-1">{links(workspace)}</nav></> : null}
        <p className="mb-2 mt-6 px-2 text-[10px] font-bold uppercase tracking-widest text-white/30">{t("Account")}</p>
        <nav className="space-y-1">{links(account)}</nav>
      </aside>
      <nav className="fixed bottom-0 left-0 right-0 z-50 overflow-x-auto border-t border-white/5 bg-[#1a0b2e]/95 px-2 pb-4 pt-2 backdrop-blur-2xl md:hidden">
        <div className="flex min-w-max gap-1">
          {mobile.map((item) => <Link className={cn("min-w-20 rounded-lg px-3 py-2 text-center text-[10px] font-black uppercase", pathname === item.href ? "bg-brand-secondary/15 text-brand-secondary" : "text-white/45")} href={item.href} key={item.href}>{t(item.label)}</Link>)}
        </div>
      </nav>
    </>
  );
}
