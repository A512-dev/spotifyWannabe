/**
 * Joins conditional Tailwind class fragments.
 * Falsy values are removed so callers can use `condition && "class"` without a
 * separate classnames dependency.
 */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
