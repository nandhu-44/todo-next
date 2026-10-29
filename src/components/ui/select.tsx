"use client";
import { Check, ChevronDown } from "lucide-react";
import { Select as S } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = S.Root;

export const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof S.Trigger>>(
  ({ className, children, ...props }, ref) => (
    <S.Trigger
      ref={ref}
      className={cn(
        "flex h-10 items-center justify-between gap-2 rounded-xl border border-slate-300/70 bg-white/80 px-3 text-sm outline-none transition focus-visible:ring-4 focus-visible:ring-sky-400/20 data-[state=open]:border-sky-400 dark:border-white/10 dark:bg-black/30",
        className,
      )}
      {...props}
    >
      {children}
      <S.Icon><ChevronDown className="size-4 text-slate-400" /></S.Icon>
    </S.Trigger>
  ),
);
SelectTrigger.displayName = "SelectTrigger";

export const SelectValue = S.Value;

export function SelectContent({ className, children, ...props }: React.ComponentProps<typeof S.Content>) {
  return (
    <S.Portal>
      <S.Content
        position="popper"
        sideOffset={6}
        className={cn(
          "z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 dark:border-white/10 dark:bg-[#161b38]",
          className,
        )}
        {...props}
      >
        <S.Viewport>{children}</S.Viewport>
      </S.Content>
    </S.Portal>
  );
}

export const SelectItem = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof S.Item>>(
  ({ className, children, ...props }, ref) => (
    <S.Item
      ref={ref}
      className={cn("relative flex cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-3 text-sm outline-none data-[highlighted]:bg-sky-500/15", className)}
      {...props}
    >
      <S.ItemIndicator className="absolute left-2.5"><Check className="size-4 text-sky-500" /></S.ItemIndicator>
      <S.ItemText>{children}</S.ItemText>
    </S.Item>
  ),
);
SelectItem.displayName = "SelectItem";
