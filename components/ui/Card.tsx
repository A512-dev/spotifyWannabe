import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

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

