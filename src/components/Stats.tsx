"use client";
import { motion } from "framer-motion";
import { AlarmClockOff, CheckCheck, ListTodo } from "lucide-react";

interface Props { total: number; done: number; overdue: number }

export default function Stats({ total, done, overdue }: Props) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  const R = 26;
  const C = 2 * Math.PI * R;
  const items = [
    { icon: ListTodo, label: "Total", value: total, color: "text-primary" },
    { icon: CheckCheck, label: "Done", value: done, color: "text-foreground" },
    { icon: AlarmClockOff, label: "Overdue", value: overdue, color: "text-destructive" },
  ];
  return (
    <div className="surface flex items-center gap-4 p-4">
      <div className="relative size-16 shrink-0">
        <svg viewBox="0 0 64 64" className="size-full -rotate-90">
          <circle cx="32" cy="32" r={R} fill="none" strokeWidth="6" className="stroke-muted" />
          <motion.circle
            cx="32" cy="32" r={R} fill="none" strokeWidth="6" strokeLinecap="round"
            className="stroke-primary"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: C * (1 - pct / 100) }}
            transition={{ type: "spring", stiffness: 60, damping: 15 }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center heading text-sm">{pct}%</span>
      </div>
      <div className="grid flex-1 grid-cols-3 gap-2 text-center">
        {items.map(({ icon: Icon, label, value, color }) => (
          <div key={label}>
            <Icon className={`mx-auto size-5 ${color}`} />
            <motion.p key={value} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="heading text-xl">
              {value}
            </motion.p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
