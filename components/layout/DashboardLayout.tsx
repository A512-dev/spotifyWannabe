import type { ReactNode } from "react";
import { MainAppLayout } from "@/components/layout/MainAppLayout";

interface DashboardLayoutProps {
  children: ReactNode;
  /** Small context label such as "Admin workspace" above the page content. */
  eyebrow: string;
}

/** Main authenticated shell plus a consistent operational-dashboard eyebrow. */
export function DashboardLayout({ children, eyebrow }: DashboardLayoutProps) {
  return (
    <MainAppLayout>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-500">{eyebrow}</p>
      {children}
    </MainAppLayout>
  );
}
