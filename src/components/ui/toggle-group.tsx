"use client";
import { motion } from "framer-motion";
import { ToggleGroup as T } from "radix-ui";
import { useId } from "react";
import { cn } from "@/lib/utils";

interface Option<V extends string> { value: V; label: string; activeClass?: string }

/** Single-select segmented control with a sliding highlight. */
export function SegmentedControl<V extends string>({
  value, onChange, options, className, label,
}: { value: V; onChange: (v: V) => void; options: Option<V>[]; className?: string; label: string }) {
  const id = useId();
  return (
    <T.Root
      type="single"
      value={value}
      aria-label={label}
      // Radix emits "" when the active item is clicked again; ignore it so one option always stays selected.
      onValueChange={(v) => v && onChange(v as V)}
      className={cn("inline-flex rounded-xl bg-muted p-1", className)}
    >
      {options.map((o) => (
        <T.Item key={o.value} value={o.value} className="relative flex-1 rounded-lg px-3 py-1.5 font-supercell text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary">
          {value === o.value && (
            <motion.span layoutId={id} className={cn("absolute inset-0 rounded-lg bg-primary", o.activeClass)} transition={{ type: "spring", stiffness: 500, damping: 35 }} />
          )}
          <span className={cn("relative", value === o.value ? "text-primary-foreground" : "text-muted-foreground")}>{o.label}</span>
        </T.Item>
      ))}
    </T.Root>
  );
}
