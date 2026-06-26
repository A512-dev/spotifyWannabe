import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-surface-700 text-slate-200",
  success: "bg-green-500/15 text-green-300",
  warning: "bg-yellow-500/15 text-yellow-200",
  danger: "bg-red-500/15 text-red-200",
  info: "bg-sky-500/15 text-sky-200"
};

export function Badge({ children, className, tone = "neutral" }: BadgeProps) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", toneClasses[tone], className)}>
      {children}
    </span>
  );
}

