"use client";
import Link from "next/link";
import { MailCheck, Mail } from "lucide-react";
import { useState } from "react";
import { AuthShell, Field, FormError, SubmitButton } from "@/components/AuthShell";
import { api } from "@/lib/api";

export default function ForgotPassword() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await api<{ devLink?: string }>("/api/auth/forgot", {
        method: "POST",
        body: { email: new FormData(e.currentTarget).get("email") },
      });
      setDevLink(r.devLink);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  }

  return (
    <AuthShell title="Reset your password">
      {sent ? (
        <div className="space-y-4 text-center">
          <MailCheck className="mx-auto size-12 text-primary" />
          <p className="text-sm text-muted-foreground">
            If an account exists for that email, a reset link is on its way. It expires in 1 hour.
          </p>
          {devLink && (
            <a href={devLink} className="block break-all rounded-xl bg-muted p-3 text-xs text-foreground">
              Dev mode (no SMTP configured) — open reset link
            </a>
          )}
          <Link href="/signin" className="block text-sm font-medium text-primary hover:underline">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a link to choose a new password.
          </p>
          <Field label="Email" icon={Mail} name="email" type="email" placeholder="john.doe@example.com" required />
          <FormError message={error} />
          <SubmitButton loading={loading}>Send reset link</SubmitButton>
          <p className="text-center text-sm">
            <Link href="/signin" className="text-primary hover:underline">Back to sign in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
