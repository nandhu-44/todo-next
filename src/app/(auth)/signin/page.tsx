"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import { useState } from "react";
import { AuthShell, Field, FormError, SubmitButton } from "@/components/AuthShell";
import { FormCheckbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";

export default function SignIn() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    setError("");
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: { email: f.get("email"), password: f.get("password"), remember: f.get("remember") === "on" },
      });
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" icon={Mail} name="email" type="email" placeholder="john.doe@example.com" autoComplete="email" required />
        <Field label="Password" icon={Lock} name="password" type="password" placeholder="Enter your password" autoComplete="current-password" required />
        <div className="flex items-center justify-between text-sm">
          <FormCheckbox id="remember" name="remember" defaultChecked>Remember me</FormCheckbox>
          <Link href="/forgot-password" className="text-sky-500 hover:underline">Forgot password?</Link>
        </div>
        <FormError message={error} />
        <SubmitButton loading={loading}>Sign in</SubmitButton>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          New here? <Link href="/signup" className="font-medium text-sky-500 hover:underline">Create an account</Link>
        </p>
      </form>
    </AuthShell>
  );
}
