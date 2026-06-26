import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  options: SelectOption[];
}

export function Select({ className, helperText, label, id, options, ...props }: SelectProps) {
  const selectId = id ?? props.name;

  return (
    <label className="block text-sm text-slate-200" htmlFor={selectId}>
      {label ? <span className="mb-2 block font-medium">{label}</span> : null}
      <select
        id={selectId}
        className={cn(
          "h-10 w-full rounded-md border border-surface-600 bg-surface-800 px-3 text-slate-50 outline-none transition focus:border-brand-500",
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText ? <span className="mt-2 block text-xs text-slate-400">{helperText}</span> : null}
    </label>
  );
}

