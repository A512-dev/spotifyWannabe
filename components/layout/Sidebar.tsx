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
    <>
      {/* سایدبار استاندارد برای تبلت و دسکتاپ */}
      <aside className="hidden w-48 shrink-0 bg-[#160926] p-4 md:flex md:flex-col shadow-xl z-10">
        <Link className="block text-2xl font-black text-white tracking-wide mb-8 px-2" href="/">
          SoundWave
        </Link>
        <nav className="space-y-2">
          {navigation.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                className={cn(
                  "block rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200",
                  active 
                    ? "bg-brand-secondary/20 text-brand-secondary shadow-sm" 
                    : "text-white/60 hover:bg-white/5 hover:text-white"
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

      {/* نوار ناوبری کپسولی و شیشه‌ای پایین مخصوص موبایل */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/5 bg-[#1a0b2e]/95 pt-3 pb-5 px-2 backdrop-blur-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.6)]">
        {navigation.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 w-full transition-all duration-200",
                active ? "text-brand-secondary scale-105" : "text-white/40 hover:text-white/70"
              )}
              href={item.href}
              key={item.href}
            >
              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
              {/* نشانگر کوچک برای تب فعال */}
              {active ? (
                <span className="h-1 w-1 rounded-full bg-brand-secondary animate-pulse shadow-[0_0_8px_rgba(var(--brand-secondary),0.8)]"></span>
              ) : (
                <span className="h-1 w-1 rounded-full bg-transparent"></span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}