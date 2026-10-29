import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border border-slate-300/70 bg-white/80 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus-visible:border-sky-400 focus-visible:ring-4 focus-visible:ring-sky-400/20 disabled:opacity-60 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder-slate-500";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(base, "h-10", className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(base, "min-h-20 resize-none", className)} {...props} />,
);
Textarea.displayName = "Textarea";
