"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, ShieldAlert } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { AuthShell, Field, FormError, SubmitButton } from "@/components/AuthShell";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const [valid, setValid] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ valid: boolean }>(`/api/auth/reset?token=${encodeURIComponent(token)}`)
      .then((r) => setValid(r.valid))
      .catch(() => setValid(false));
  }, [token]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("password") !== f.get("confirm")) return setError("Passwords don't match");
    setLoading(true);
    setError("");
    try {
      await api("/api/auth/reset", { method: "POST", body: { token, password: f.get("password") } });
      notify.success("Password updated. Please sign in.");
      router.replace("/signin");
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  if (valid === null) return <p className="text-center text-sm text-muted-foreground">Checking link…</p>;
  if (!valid)
    return (
      <div className="space-y-4 text-center">
        <ShieldAlert className="mx-auto size-12 text-destructive" />
        <p className="text-sm text-muted-foreground">This reset link is invalid or has expired.</p>
        <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">Request a new link</Link>
      </div>
    );
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="New password" icon={Lock} name="password" type="password" minLength={8} autoComplete="new-password" required />
      <Field label="Confirm password" icon={Lock} name="confirm" type="password" minLength={8} autoComplete="new-password" required />
      <FormError message={error} />
      <SubmitButton loading={loading}>Update password</SubmitButton>
    </form>
  );
}

export default function ResetPassword() {
  return (
    <AuthShell title="Choose a new password">
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
