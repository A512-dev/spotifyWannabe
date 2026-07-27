import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Variants encode semantic intent; sizes encode consistent control dimensions.
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visible button content; native attributes such as disabled remain supported. */
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

// Keeping class maps outside the component avoids rebuilding them on each render.
const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-brand-500 text-surface-900 hover:bg-brand-600",
  secondary: "bg-surface-700 text-slate-50 hover:bg-surface-600",
  ghost: "bg-transparent text-slate-200 hover:bg-surface-700",
  danger: "bg-red-500 text-white hover:bg-red-600"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base"
};

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  // Defaulting to type="button" prevents accidental form submission. Callers
  // must opt into type="submit" for intentional form actions.
  return (
    <button
      className={cn(
        // Base classes define shared shape, behavior, and disabled affordances.
        "inline-flex items-center justify-center rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        // Semantic variant, dimension, then caller overrides are composed in order.
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
