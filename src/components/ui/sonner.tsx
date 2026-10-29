"use client";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      closeButton={false}
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border !border-white/20 !bg-white/90 dark:!bg-[#161b38]/95 !text-slate-800 dark:!text-slate-100 !font-poppins !shadow-2xl !backdrop-blur-xl",
          actionButton: "!bg-sky-500 !font-supercell !tracking-wide !text-white !rounded-lg",
        },
      }}
    />
  );
}
