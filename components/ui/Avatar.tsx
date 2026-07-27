import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string;
  className?: string;
}

export function Avatar({ className, name, src }: AvatarProps) {
  // Convert up to the first two space-separated name parts into fallback initials.
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (src) {
    // A supplied image wins; object-cover avoids distortion in the circular crop.
    return (
      <img
        alt={`${name} avatar`}
        className={cn("h-10 w-10 rounded-full border border-surface-600 object-cover", className)}
        src={src}
      />
    );
  }

  return (
    // Text fallback remains accessible through an explicit label.
    <span
      aria-label={`${name} avatar`}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-600 bg-brand-500 text-sm font-semibold text-surface-900",
        className
      )}
    >
      {initials}
    </span>
  );
}
