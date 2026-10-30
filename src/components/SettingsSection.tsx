"use client";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export function Section({ icon: Icon, title, description, children, danger }: { icon: LucideIcon; title: string; description?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={`surface p-5 ${danger ? "border-destructive/40" : ""}`}>
      <div className="mb-4 flex items-start gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${danger ? "bg-destructive/12 text-destructive" : "bg-primary/15 text-primary"}`}>
          <Icon className="size-5" />
        </span>
        <div>
          <h2 className="heading text-lg">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

