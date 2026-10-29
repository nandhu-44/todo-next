"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User } from "lucide-react";
import { useState } from "react";
import { AuthShell, Field, FormError, SubmitButton } from "@/components/AuthShell";
import { api } from "@/lib/api";

export default function SignUp() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("password") !== f.get("confirm")) return setError("Passwords don't match");
    setLoading(true);
    setError("");
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: { name: f.get("name"), email: f.get("email"), password: f.get("password") },
      });
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create your account">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Name" icon={User} name="name" placeholder="John Doe" autoComplete="name" required maxLength={60} />
        <Field label="Email" icon={Mail} name="email" type="email" placeholder="john.doe@example.com" autoComplete="email" required />
        <Field label="Password" icon={Lock} name="password" type="password" placeholder="At least 8 characters" autoComplete="new-password" minLength={8} required />
        <Field label="Confirm password" icon={Lock} name="confirm" type="password" placeholder="Re-enter your password" autoComplete="new-password" minLength={8} required />
        <FormError message={error} />
        <SubmitButton loading={loading}>Sign up</SubmitButton>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account? <Link href="/signin" className="font-medium text-sky-500 hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
