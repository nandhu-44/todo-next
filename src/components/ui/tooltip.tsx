"use client";
import { Tooltip as T } from "radix-ui";

export const TooltipProvider = T.Provider;

export function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <T.Root delayDuration={300}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          sideOffset={6}
          className="z-[60] rounded-lg bg-slate-900 px-2.5 py-1 text-xs text-white shadow-lg data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 dark:bg-white dark:text-slate-900"
        >
          {label}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
