"use client";
import { DropdownMenu as M } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

export const DropdownMenu = M.Root;
export const DropdownMenuTrigger = M.Trigger;

export function DropdownMenuContent({ className, ...props }: React.ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content
        align="end"
        sideOffset={8}
        className={cn(
          "z-50 min-w-48 rounded-xl border border-border bg-popover p-1 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0",
          className,
        )}
        {...props}
      />
    </M.Portal>
  );
}

export const DropdownMenuItem = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof M.Item>>(
  ({ className, ...props }, ref) => (
    <M.Item ref={ref} className={cn("flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-primary/15 [&_svg]:size-4", className)} {...props} />
  ),
);
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuLabel = ({ className, ...props }: React.ComponentProps<typeof M.Label>) => (
  <M.Label className={cn("px-3 py-2 text-xs text-muted-foreground", className)} {...props} />
);
export const DropdownMenuSeparator = () => <M.Separator className="my-1 h-px bg-border" />;
