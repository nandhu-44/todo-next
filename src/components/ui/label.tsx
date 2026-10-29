"use client";
import { Label as LabelPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<HTMLLabelElement, React.ComponentProps<typeof LabelPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <LabelPrimitive.Root ref={ref} className={cn("font-supercell text-sm tracking-wide text-slate-600 dark:text-slate-300", className)} {...props} />
  ),
);
Label.displayName = "Label";
