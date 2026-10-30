"use client";
import { Switch as S } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof S.Root>>(({ className, ...props }, ref) => (
  <S.Root
    ref={ref}
    className={cn(
      "inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent bg-muted-foreground/30 outline-none transition-colors focus-visible:ring-4 focus-visible:ring-primary/30 disabled:opacity-60 data-[state=checked]:bg-primary",
      className,
    )}
    {...props}
  >
    <S.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
  </S.Root>
));
Switch.displayName = "Switch";
