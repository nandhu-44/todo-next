"use client";
import Link from "next/link";
import { Lock, Mail } from "lucide-react";
import { useState } from "react";
import { AUTH_ERRORS, AuthShell, Field, FormError, GoogleButton, OrDivider, SubmitButton } from "./AuthShell";
import { FormCheckbox } from "./ui/checkbox";
import { api } from "@/lib/api";

export default function SignInForm({ googleEnabled, initialError }: { googleEnabled: boolean; initialError?: string }) {
  const [error, setError] = useState(initialError ? AUTH_ERRORS[initialError] ?? "" : "");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    setError("");
    try {
      const { twoFactor } = await api<{ twoFactor?: boolean }>("/api/auth/login", {
        method: "POST",
        body: { email: f.get("email"), password: f.get("password"), remember: f.get("remember") === "on" },
      });
      // full page load on purpose: a soft router.replace()+refresh() races and can leave the old signed-in UI on screen
      window.location.assign(twoFactor ? "/two-factor" : "/");
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to see your todos">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" icon={Mail} name="email" type="email" placeholder="john.doe@example.com" autoComplete="email" required />
        <Field label="Password" icon={Lock} name="password" type="password" placeholder="Enter your password" autoComplete="current-password" required />
        <div className="flex items-center justify-between text-sm">
          <FormCheckbox id="remember" name="remember" defaultChecked>Remember me</FormCheckbox>
          <Link href="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
        </div>
        <FormError message={error} />
        <SubmitButton loading={loading}>Sign in</SubmitButton>
        {googleEnabled && (<><OrDivider /><GoogleButton /></>)}
        <p className="text-center text-sm text-muted-foreground">
          New here? <Link href="/signup" className="font-medium text-primary hover:underline">Create an account</Link>
        </p>
      </form>
    </AuthShell>
  );
}
