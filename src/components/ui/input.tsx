import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border border-border bg-background/60 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-60";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(base, "h-10", className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(base, "min-h-20 resize-none", className)} {...props} />,
);
Textarea.displayName = "Textarea";
