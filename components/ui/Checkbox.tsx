import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Text or rich inline content associated with the checkbox. */
  label: ReactNode;
}

export function Checkbox({ className, label, id, ...props }: CheckboxProps) {
  // Fall back to name so clicking the visible label still toggles the input.
  const checkboxId = id ?? props.name;

  return (
    <label className="flex items-center gap-3 text-sm text-slate-200" htmlFor={checkboxId}>
      {/* Consumers cannot change the semantic input type through props. */}
      <input
        id={checkboxId}
        type="checkbox"
        className={cn("h-4 w-4 rounded border-surface-600 accent-brand-500", className)}
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}
