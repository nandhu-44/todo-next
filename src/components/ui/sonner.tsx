"use client";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      closeButton={false}
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border !border-border !bg-popover !text-foreground !font-poppins !shadow-xl",
          actionButton: "!bg-primary !font-supercell !tracking-wide !text-primary-foreground !rounded-lg",
        },
      }}
    />
  );
}
