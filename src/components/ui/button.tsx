import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-supercell tracking-wide transition active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/30 disabled:pointer-events-none disabled:opacity-60 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/25 hover:from-sky-400 hover:to-indigo-400",
        secondary: "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15",
        destructive: "bg-red-500 text-white hover:bg-red-400",
        warning: "bg-amber-500 text-white hover:bg-amber-400",
        ghost: "text-slate-500 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-white/10",
        glass: "glass text-slate-700 dark:text-slate-100",
      },
      size: {
        default: "h-10 px-4 text-base",
        lg: "h-12 px-6 text-lg [&_svg]:size-5",
        icon: "size-10",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  },
);
Button.displayName = "Button";
