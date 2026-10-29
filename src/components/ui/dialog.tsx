"use client";
import { X } from "lucide-react";
import { Dialog as D, AlertDialog as AD } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

const overlay =
  "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0";
const content =
  "fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=open]:slide-in-from-bottom-2";

export const Dialog = D.Root;
export const DialogClose = D.Close;

export const DialogContent = React.forwardRef<HTMLDivElement, React.ComponentProps<typeof D.Content> & { title: React.ReactNode; description?: string; footer?: React.ReactNode }>(
  ({ className, children, title, description, footer, ...props }, ref) => (
    <D.Portal>
      <D.Overlay className={overlay} />
      <D.Content ref={ref} className={cn(content, className)} aria-describedby={description ? undefined : undefined} {...props}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <D.Title className="heading truncate text-lg">{title}</D.Title>
          <D.Close aria-label="Close" className="rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <X className="size-5" />
          </D.Close>
        </div>
        {description && <D.Description className="sr-only">{description}</D.Description>}
        <div className="max-h-[65vh] overflow-y-auto p-5">{children}</div>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </D.Content>
    </D.Portal>
  ),
);
DialogContent.displayName = "DialogContent";

export const DialogFooter = ({ children }: { children: React.ReactNode }) => (
  <div className="flex justify-end gap-2 border-t border-border bg-muted/40 px-5 py-3">{children}</div>
);

/* Alert dialog: for confirmations that must be answered explicitly */
export const AlertDialog = AD.Root;
export const AlertDialogCancel = AD.Cancel;
export const AlertDialogAction = AD.Action;

export function AlertDialogContent({ title, children, footer }: { title: React.ReactNode; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <AD.Portal>
      <AD.Overlay className={overlay} />
      <AD.Content className={content}>
        <div className="border-b border-border px-5 py-3.5">
          <AD.Title className="heading text-lg">{title}</AD.Title>
        </div>
        <AD.Description asChild>
          <div className="p-5">{children}</div>
        </AD.Description>
        <DialogFooter>{footer}</DialogFooter>
      </AD.Content>
    </AD.Portal>
  );
}
