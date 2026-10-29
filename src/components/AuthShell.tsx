"use client";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import ThemeToggle from "./ThemeToggle";

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
        className="glass w-full max-w-md space-y-6 rounded-3xl p-6 sm:p-8"
      >
        <div className="flex items-center justify-center gap-2">
          <motion.div initial={{ rotate: -180, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.15, type: "spring" }}>
            <Image src="/checkmark.png" alt="" width={36} height={36} priority />
          </motion.div>
          <h1 className="font-supercell text-3xl tracking-wide text-sky-500 dark:text-sky-300">ToDo App</h1>
        </div>
        <h2 className="text-center font-supercell text-xl tracking-wide">{title}</h2>
        {children}
      </motion.div>
    </main>
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
}
export function Field({ label, icon: Icon, type, ...rest }: FieldProps) {
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  return (
    <div className="space-y-1.5">
      <Label htmlFor={rest.name}>{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input {...rest} id={rest.name} type={isPw && show ? "text" : type} className="pl-10 pr-10" />
        {isPw && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-sky-400"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

export function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" size="lg" disabled={loading} className="w-full">
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <motion.p
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
      role="alert"
      className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-500 dark:text-rose-300"
    >
      {message}
    </motion.p>
  );
}
