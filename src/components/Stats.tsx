"use client";
import { motion } from "framer-motion";
import { AlarmClockOff, CheckCheck, ListTodo } from "lucide-react";

interface Props { total: number; done: number; overdue: number }

export default function Stats({ total, done, overdue }: Props) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  const R = 26;
  const C = 2 * Math.PI * R;
  const items = [
    { icon: ListTodo, label: "Total", value: total, color: "text-sky-500 dark:text-sky-300" },
    { icon: CheckCheck, label: "Done", value: done, color: "text-emerald-500 dark:text-emerald-300" },
    { icon: AlarmClockOff, label: "Overdue", value: overdue, color: "text-rose-500 dark:text-rose-300" },
  ];
  return (
    <div className="glass flex items-center gap-4 rounded-2xl p-4">
      <div className="relative size-16 shrink-0">
        <svg viewBox="0 0 64 64" className="size-full -rotate-90">
          <circle cx="32" cy="32" r={R} fill="none" strokeWidth="6" className="stroke-slate-200 dark:stroke-white/10" />
          <motion.circle
            cx="32" cy="32" r={R} fill="none" strokeWidth="6" strokeLinecap="round"
            className="stroke-sky-500"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: C * (1 - pct / 100) }}
            transition={{ type: "spring", stiffness: 60, damping: 15 }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-supercell text-sm">{pct}%</span>
      </div>
      <div className="grid flex-1 grid-cols-3 gap-2 text-center">
        {items.map(({ icon: Icon, label, value, color }) => (
          <div key={label}>
            <Icon className={`mx-auto size-5 ${color}`} />
            <motion.p key={value} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="font-supercell text-xl">
              {value}
            </motion.p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
