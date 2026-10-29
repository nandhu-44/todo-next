"use client";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type Kind = "success" | "error" | "info" | "warning";
interface Toast {
  id: number;
  kind: Kind;
  title: string;
  action?: { label: string; onClick: () => void };
  duration: number;
}
type PushToast = (t: { kind?: Kind; title: string; action?: Toast["action"]; duration?: number }) => void;

const Ctx = createContext<PushToast>(() => {});
export const useToast = () => useContext(Ctx);

const STYLE: Record<Kind, { icon: typeof Info; color: string; bar: string }> = {
  success: { icon: CheckCircle2, color: "text-emerald-400", bar: "bg-emerald-400" },
  error: { icon: XCircle, color: "text-rose-400", bar: "bg-rose-400" },
  info: { icon: Info, color: "text-sky-400", bar: "bg-sky-400" },
  warning: { icon: AlertTriangle, color: "text-amber-400", bar: "bg-amber-400" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback<PushToast>(
    ({ kind = "success", title, action, duration }) => {
      const id = ++next.current;
      const d = duration ?? (action ? 6000 : 3200);
      setToasts((t) => [...t.slice(-3), { id, kind, title, action, duration: d }]);
      setTimeout(() => dismiss(id), d);
    },
    [dismiss],
  );
  const value = useMemo(() => push, [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const s = STYLE[t.kind];
            const Icon = s.icon;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="glass pointer-events-auto relative flex w-full max-w-sm items-center gap-3 overflow-hidden rounded-xl px-4 py-3 text-sm shadow-2xl"
              >
                <Icon className={`size-5 shrink-0 ${s.color}`} />
                <span className="flex-1 font-medium">{t.title}</span>
                {t.action && (
                  <button
                    onClick={() => {
                      t.action!.onClick();
                      dismiss(t.id);
                    }}
                    className="rounded-lg bg-sky-500/15 px-2.5 py-1 font-supercell text-sky-500 hover:bg-sky-500/25 dark:text-sky-300"
                  >
                    {t.action.label}
                  </button>
                )}
                <motion.span
                  className={`absolute bottom-0 left-0 h-0.5 ${s.bar}`}
                  initial={{ width: "100%" }}
                  animate={{ width: 0 }}
                  transition={{ duration: t.duration / 1000, ease: "linear" }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
