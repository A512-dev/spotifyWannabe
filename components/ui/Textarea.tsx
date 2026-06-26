import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
}

export function Textarea({
  className,
  helperText,
  label,
  id,
  rows = 4,
  ...props
}: TextareaProps) {
  const textareaId = id ?? props.name;

  return (
    <label className="block text-sm text-slate-200" htmlFor={textareaId}>
      {label ? <span className="mb-2 block font-medium">{label}</span> : null}
      <textarea
        id={textareaId}
        rows={rows}
        className={cn(
          "w-full rounded-md border border-surface-600 bg-surface-800 px-3 py-2 text-slate-50 outline-none transition placeholder:text-slate-500 focus:border-brand-500",
          className
        )}
        {...props}
      />
      {helperText ? <span className="mt-2 block text-xs text-slate-400">{helperText}</span> : null}
    </label>
  );
}

