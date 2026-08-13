"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ACCOUNT_NAVIGATION, SIDEBAR_NAVIGATION } from "@/config/navigation";
import { filterNavigationForUser } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useAuth, useUserPreferences } from "@/providers";
import type { NavigationItem } from "@/types/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const { currentUser } = useAuth();
  const { t } = useUserPreferences();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);
  if (!currentUser) return null;

  const main = filterNavigationForUser(SIDEBAR_NAVIGATION, currentUser);
  const account = filterNavigationForUser(ACCOUNT_NAVIGATION, currentUser);
  const workspaceHrefs = new Set(["/artist-dashboard", "/support", "/admin"]);
  const primary = main.filter((item) => !workspaceHrefs.has(item.href));
  const workspace = main.filter((item) => workspaceHrefs.has(item.href));

  const links = (items: NavigationItem[], onNavigate?: () => void) => items.map((item) => {
    const active = pathname === item.href;
    return <Link className={cn("block rounded-xl px-4 py-2.5 text-sm font-bold transition", active ? "bg-brand-secondary/20 text-brand-secondary" : "text-white/60 hover:bg-white/5 hover:text-white")} href={item.href} key={item.href} onClick={onNavigate}>{t(item.label)}</Link>;
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
      <button
        aria-controls="mobile-navigation"
        aria-expanded={isMobileMenuOpen}
        aria-label={t(isMobileMenuOpen ? "Close navigation" : "Open navigation")}
        className="fixed left-4 top-4 z-50 grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-[#1a0b2e]/95 text-white shadow-lg backdrop-blur-xl md:hidden"
        onClick={() => setIsMobileMenuOpen((open) => !open)}
        type="button"
      >
        <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          {isMobileMenuOpen ? <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />}
        </svg>
      </button>
      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button aria-label={t("Close navigation")} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} type="button" />
          <aside className="relative h-full w-72 max-w-[85vw] overflow-y-auto bg-[#160926] p-4 pt-20 shadow-2xl">
            <Link className="mb-7 block px-2 text-2xl font-black text-white" href="/" onClick={() => setIsMobileMenuOpen(false)}>SoundWave</Link>
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-white/30">{t("Main navigation")}</p>
            <nav className="space-y-1">{links(primary, () => setIsMobileMenuOpen(false))}</nav>
            {workspace.length ? <><p className="mb-2 mt-6 px-2 text-[10px] font-bold uppercase tracking-widest text-white/30">{t("Workspace")}</p><nav className="space-y-1">{links(workspace, () => setIsMobileMenuOpen(false))}</nav></> : null}
            <p className="mb-2 mt-6 px-2 text-[10px] font-bold uppercase tracking-widest text-white/30">{t("Account")}</p>
            <nav className="space-y-1">{links(account, () => setIsMobileMenuOpen(false))}</nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
