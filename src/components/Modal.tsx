"use client";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Modal({ open, onClose, title, children, footer }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 40, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl dark:border-white/10 dark:bg-[#12162e]"
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-3 text-white">
              <h2 className="truncate font-supercell text-lg tracking-wide">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 transition hover:bg-white/20">
                <X className="size-5" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-5">{children}</div>
            {footer && (
              <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-white/10 dark:bg-black/20">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
