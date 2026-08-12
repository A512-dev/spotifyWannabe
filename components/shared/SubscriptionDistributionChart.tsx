"use client";

import { formatNumber } from "@/lib/formatters";
import { useUserPreferences } from "@/providers";

interface SubscriptionDistributionChartProps {
  distribution: {
    basic: number;
    silver: number;
    gold: number;
    total: number;
  };
}

const segments = [
  { key: "basic", label: "Basic", color: "#94a3b8" },
  { key: "silver", label: "Silver", color: "#38bdf8" },
  { key: "gold", label: "Gold", color: "#f59e0b" }
] as const;

export function SubscriptionDistributionChart({ distribution }: SubscriptionDistributionChartProps) {
  const { locale, t } = useUserPreferences();
  const total = distribution.total;
  const basicEnd = total ? (distribution.basic / total) * 100 : 0;
  const silverEnd = total ? basicEnd + (distribution.silver / total) * 100 : 0;
  const chartBackground = total
    ? `conic-gradient(#94a3b8 0 ${basicEnd}%, #38bdf8 ${basicEnd}% ${silverEnd}%, #f59e0b ${silverEnd}% 100%)`
    : "#334155";

  return (
    <div className="grid items-center gap-6 md:grid-cols-[180px_1fr]">
      <div
        aria-label={t("Subscription distribution for {count} users", { count: formatNumber(total, locale) })}
        className="relative mx-auto h-44 w-44 rounded-full"
        role="img"
        style={{ background: chartBackground }}
      >
        <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-surface-800">
          <strong className="text-2xl text-slate-50">{formatNumber(total, locale)}</strong>
          <span className="text-xs text-slate-400">{t("users")}</span>
        </div>
      </div>
      <div className="space-y-3">
        {segments.map((segment) => {
          const count = distribution[segment.key];
          const percentage = total ? Math.round((count / total) * 100) : 0;
          return (
            <div className="flex items-center justify-between gap-4" key={segment.key}>
              <span className="flex items-center gap-2 text-sm text-slate-200">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
                {t(segment.label)}
              </span>
              <span className="text-sm text-slate-400">
                {formatNumber(count, locale)} ({formatNumber(percentage, locale)}{locale === "fa-IR" ? "٪" : "%"})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
