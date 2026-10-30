"use client";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, type LucideIcon } from "lucide-react";
import Logo from "./Logo";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
        className="surface w-full max-w-md space-y-6 p-6 shadow-xl sm:p-8"
      >
        <div className="space-y-1 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Logo />
            <span className="heading text-2xl text-primary">ToDo Next</span>
          </div>
          <h1 className="heading text-2xl">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
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
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input {...rest} id={rest.name} type={isPw && show ? "text" : type} className="pl-10 pr-10" />
        {isPw && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-primary"
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
      key={message}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
      role="alert"
      className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </motion.p>
  );
}

export function GoogleButton({ remember = true, link = false, label = "Continue with Google" }: { remember?: boolean; link?: boolean; label?: string }) {
  return (
    <Button asChild variant="outline" size="lg" className="w-full">
      {/* a full-page navigation: the OAuth flow redirects through Google */}
      <a href={link ? "/api/auth/google?link=1" : `/api/auth/google${remember ? "" : "?remember=0"}`}>
        <svg viewBox="0 0 24 24" className="!size-5" aria-hidden>
          <path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h5.9a5.04 5.04 0 0 1-2.19 3.31v2.75h3.54c2.07-1.9 3.25-4.7 3.25-8.09Z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.54-2.75c-.98.66-2.24 1.05-3.74 1.05-2.87 0-5.3-1.94-6.17-4.55H2.18v2.84A11 11 0 0 0 12 23Z" />
          <path fill="#FBBC05" d="M5.83 13.09a6.6 6.6 0 0 1 0-4.18V6.07H2.18a11 11 0 0 0 0 9.86l3.65-2.84Z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.65 2.84C6.7 7.32 9.13 5.38 12 5.38Z" />
        </svg>
        {label}
      </a>
    </Button>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs uppercaser text-muted-foreground">
      <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export const AUTH_ERRORS: Record<string, string> = {
  google_unavailable: "Google sign-in isn't set up on this server.",
  google_denied: "Google sign-in was cancelled.",
  google_failed: "Google sign-in didn't work. Please try again.",
  google_unverified: "Your Google email isn't verified, so we can't sign you in with it.",
  google_conflict: "This email is already linked to a different Google account.",
  google_taken: "That Google account is already linked to another ToDo Next account.",
  google_email_mismatch: "That Google account uses a different email than this account. Sign in with the Google account that has your email.",
};
