import { cn } from "@/lib/utils";

/** App mark: a rounded tile with a check, drawn in the theme's primary colour. */
export default function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path d="M9 16.5l4.8 4.8L23 11.5" fill="none" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className="stroke-primary-foreground" />
    </svg>
  );
}
