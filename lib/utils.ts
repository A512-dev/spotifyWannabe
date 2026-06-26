// Tiny className helper. It avoids adding a dependency before the team agrees on one.
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

