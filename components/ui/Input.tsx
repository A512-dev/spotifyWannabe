import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
}

export function Input({ className, helperText, label, id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="block text-sm text-slate-200" htmlFor={inputId}>
      {label ? <span className="mb-2 block font-medium">{label}</span> : null}
      <input
        id={inputId}
        className={cn(
          "h-10 w-full rounded-md border border-surface-600 bg-surface-800 px-3 text-slate-50 outline-none transition placeholder:text-slate-500 focus:border-brand-500",
          className
        )}
        {...props}
      />
      {helperText ? <span className="mt-2 block text-xs text-slate-400">{helperText}</span> : null}
    </label>
  );
}

