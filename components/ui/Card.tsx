import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * Neutral raised surface used as the visual base for product-level cards.
 * Native div attributes are forwarded so callers can attach handlers/ARIA data.
 */
export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-lg border border-surface-600 bg-surface-800 p-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}
