"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { AuthShell, Field, FormError, SubmitButton } from "./AuthShell";
import { OtpInput } from "./OtpInput";

export default function TwoFactorForm() {
  const router = useRouter();
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  async function submit(body: { code?: string; recovery?: string }) {
    setLoading(true);
    setError("");
    try {
      await api("/api/auth/2fa", { method: "POST", body });
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setAttempt((n) => n + 1);
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Two-step verification"
      subtitle={useRecovery ? "Enter one of your saved recovery codes" : "Enter the 6-digit code from your authenticator app"}
    >
      {useRecovery ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit({ recovery: String(new FormData(e.currentTarget).get("recovery")) });
          }}
          className="space-y-4"
        >
          <Field label="Recovery code" icon={KeyRound} name="recovery" placeholder="a1b2-c3d4" autoComplete="off" required />
          <FormError message={error} />
          <SubmitButton loading={loading}>Verify</SubmitButton>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center text-primary"><ShieldCheck className="size-10" /></div>
          <OtpInput onComplete={(code) => submit({ code })} disabled={loading} autoFocus resetKey={attempt} />
          <FormError message={error} />
        </div>
      )}
      <div className="flex flex-col items-center gap-2 text-sm">
        <button onClick={() => { setUseRecovery((v) => !v); setError(""); }} className="font-medium text-primary hover:underline">
          {useRecovery ? "Use authenticator code instead" : "Use a recovery code"}
        </button>
        <Link href="/signin" className="text-muted-foreground hover:underline">Back to sign in</Link>
      </div>
    </AuthShell>
  );
}
