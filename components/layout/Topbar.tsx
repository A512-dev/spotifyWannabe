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

  const isGold = currentUser.subscriptionTier === "gold";

  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#1a0b2e]/60 px-6 py-3.5 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.2)]">
      <div className="flex items-center justify-between gap-4">
        
        {/* بخش چپ: اطلاعات اکانت با چراغ سیگنال آنلاین */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] tracking-wider uppercase text-white/40 font-bold">Session Active</p>
            <p className="truncate text-sm font-black text-white/95 tracking-wide drop-shadow-sm">
              {currentUser.displayName}
            </p>
          </div>
        </div>

        {/* بخش راست: ناوبری، بج‌ها و پروفایل */}
        <div className="flex items-center gap-5">
          
          {/* کپسول‌های مدرن نقش و سابسکریپشن */}
          <div className="hidden gap-2.5 sm:flex items-center">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-white/10 text-white/80 border border-white/5">
              {getRoleLabel(currentUser.role)}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase border ${
              isGold 
                ? "bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-orange-500/20 text-amber-300 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)] animate-pulse" 
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }`}>
              {getSubscriptionLabel(currentUser.subscriptionTier)}
            </span>
          </div>

          {/* کپسول شیشه‌ای و یک‌پارچه برای لینک‌های حساب کاربری (Settings, Profile, ...) */}
          <nav className="hidden items-center bg-white/[0.03] border border-white/[0.05] rounded-full p-1 text-xs font-bold text-white/70 lg:flex shadow-inner">
            {accountLinks.map((item) => (
              <Link 
                className="px-3.5 py-1.5 rounded-full hover:text-white hover:bg-white/[0.06] transition-all duration-200" 
                href={item.href} 
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
<<<<<<< Updated upstream
          <Avatar name={currentUser.displayName} src={currentUser.avatarUrl} />
=======

          {/* line جداکننده ظریف */}
          <span className="hidden lg:block h-4 w-[1px] bg-white/10"></span>

          {/* بخش آواتار و دکمه خروج */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-0.5 rounded-full bg-gradient-to-b from-white/20 to-transparent shadow-md">
              <Avatar name={currentUser.displayName} src={currentUser.avatarUrl} />
            </div>
            
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 border border-rose-500/0 hover:border-rose-500/20 hover:bg-rose-500/10 transition-all duration-200 group"
            >
              <span>Log out</span>
              <svg 
                className="h-3.5 w-3.5 transform transition-transform group-hover:translate-x-0.5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>

>>>>>>> Stashed changes
        </div>
      </div>
    </header>
  );
<<<<<<< Updated upstream
}

=======
}
>>>>>>> Stashed changes
