"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { Checkbox as C } from "radix-ui";
import { cn } from "@/lib/utils";

/** Round checkbox used on todo cards. */
export function RoundCheckbox({ checked, onCheckedChange, label }: { checked: boolean; onCheckedChange: (c: boolean) => void; label: string }) {
  return (
    <C.Root
      checked={checked}
      onCheckedChange={(c) => onCheckedChange(c === true)}
      aria-label={label}
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full border-2 outline-none transition-colors focus-visible:ring-4 focus-visible:ring-primary/30 active:scale-90",
        checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50 hover:border-primary hover:bg-primary/10",
      )}
    >
      <AnimatePresence>
        {checked && (
          <C.Indicator forceMount asChild>
            <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
              <Check className="size-4" strokeWidth={3.5} />
            </motion.span>
          </C.Indicator>
        )}
      </AnimatePresence>
    </C.Root>
  );
}

/** Standard checkbox for forms. */
export function FormCheckbox({ id, name, defaultChecked, children }: { id: string; name: string; defaultChecked?: boolean; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm">
      <C.Root id={id} name={name} defaultChecked={defaultChecked} className="grid size-5 place-items-center rounded-md border border-border bg-background/60 outline-none transition focus-visible:ring-4 focus-visible:ring-primary/30 data-[state=checked]:border-primary data-[state=checked]:bg-primary">
        <C.Indicator><Check className="size-3.5 text-primary-foreground" strokeWidth={3.5} /></C.Indicator>
      </C.Root>
      {children}
    </label>
  );
}
