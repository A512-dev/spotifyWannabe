import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

interface EmptyStateProps {
  title: string;
  description: string;
  /** Optional caller-owned CTA such as "Create first playlist". */
  action?: ReactNode;
}

/** Consistent explanation and recovery action for lists with no content. */
export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-start gap-3">
      <h3 className="text-lg font-semibold text-slate-50">{title}</h3>
      <p className="max-w-xl text-sm text-slate-400">{description}</p>
      {action ? <div>{action}</div> : null}
    </Card>
  );
}
