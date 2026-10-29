"use client";
import { format, parseISO } from "date-fns";
import { CalendarDays, X } from "lucide-react";
import { Popover } from "radix-ui";
import { useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";

/** value / onChange use YYYY-MM-DD strings (or "" for none). */
export function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className="flex gap-2">
        <Popover.Trigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-10 flex-1 items-center gap-2 rounded-xl border border-border bg-background/60 px-3.5 text-left text-sm outline-none transition focus-visible:ring-4 focus-visible:ring-primary/20 data-[state=open]:border-primary",
              !selected && "text-muted-foreground/70",
            )}
          >
            <CalendarDays className="size-4" />
            {selected ? format(selected, "EEE, d MMM yyyy") : "No due date"}
          </button>
        </Popover.Trigger>
        {selected && (
          <button type="button" onClick={() => onChange("")} aria-label="Clear due date" className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        )}
      </div>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[70] rounded-2xl border border-border bg-popover p-3 shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DayPicker
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={(d) => {
              onChange(d ? format(d, "yyyy-MM-dd") : "");
              setOpen(false);
            }}
            style={{ "--rdp-accent-color": "#0ea5e9", "--rdp-accent-background-color": "rgb(14 165 233 / 0.15)" } as React.CSSProperties}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
