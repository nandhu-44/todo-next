"use client";
import { startAuthentication } from "@simplewebauthn/browser";
import Link from "next/link";
import { Fingerprint, Lock, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { AUTH_ERRORS, AuthShell, Field, FormError, GoogleButton, OrDivider, SubmitButton } from "./AuthShell";
import Captcha from "./Captcha";
import { Button } from "./ui/button";
import { FormCheckbox } from "./ui/checkbox";
import { api } from "@/lib/api";
import type { CaptchaConfig } from "@/lib/captcha";
import { passkeyError, supportsPasskeys } from "@/lib/passkeyClient";

export default function SignInForm({ googleEnabled, captcha, initialError }: { googleEnabled: boolean; captcha: CaptchaConfig; initialError?: string }) {
  const [error, setError] = useState(initialError ? AUTH_ERRORS[initialError] ?? "" : "");
  const [loading, setLoading] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [canPasskey, setCanPasskey] = useState(false);
  const [remember, setRemember] = useState(true);
  // The security check appears only after a few wrong passwords, so normal sign-ins never see it.
  const [needCaptcha, setNeedCaptcha] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const blocked = needCaptcha && captcha.provider !== "off" && !token;
  useEffect(() => setCanPasskey(supportsPasskeys()), []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    setError("");
    try {
      const { twoFactor } = await api<{ twoFactor?: boolean }>("/api/auth/login", {
        method: "POST",
        body: { email: f.get("email"), password: f.get("password"), remember, captcha: needCaptcha ? token : undefined },
      });
      // full page load on purpose: a soft router.replace()+refresh() races and can leave the old signed-in UI on screen
      window.location.assign(twoFactor ? "/two-factor" : "/");
    } catch (err) {
      setError((err as Error).message);
      if ((err as { data?: { captchaRequired?: boolean } }).data?.captchaRequired) setNeedCaptcha(true);
      setResetKey((k) => k + 1);
      setLoading(false);
    }
  }

  // Passkey sign-in needs no email or password: the device offers the passkeys it holds for this site.
  async function withPasskey() {
    setPasskeyBusy(true);
    setError("");
    try {
      const optionsJSON = await api<Parameters<typeof startAuthentication>[0]["optionsJSON"]>("/api/auth/passkey/options", { method: "POST" });
      const response = await startAuthentication({ optionsJSON });
      await api("/api/auth/passkey/verify", { method: "POST", body: { response, remember } });
      window.location.assign("/");
    } catch (err) {
      setError(passkeyError(err));
      setPasskeyBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to see your todos">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" icon={Mail} name="email" type="email" placeholder="john.doe@example.com" autoComplete="email webauthn" required />
        <Field label="Password" icon={Lock} name="password" type="password" placeholder="Enter your password" autoComplete="current-password" required />
        <div className="flex items-center justify-between text-sm">
          <FormCheckbox id="remember" name="remember" checked={remember} onCheckedChange={setRemember}>Remember me</FormCheckbox>
          <Link href="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
        </div>
        {needCaptcha && <Captcha config={captcha} onToken={setToken} resetKey={resetKey} />}
        <FormError message={error} />
        <SubmitButton loading={loading} disabled={blocked}>Sign in</SubmitButton>
        {(googleEnabled || canPasskey) && <OrDivider />}
        {canPasskey && (
          <Button type="button" variant="outline" size="lg" className="w-full" disabled={passkeyBusy} onClick={withPasskey}>
            <Fingerprint className="!size-5" /> {passkeyBusy ? "Waiting for your device…" : "Sign in with a passkey"}
          </Button>
        )}
        {googleEnabled && <GoogleButton />}
        <p className="text-center text-sm text-muted-foreground">
          New here? <Link href="/signup" className="font-medium text-primary hover:underline">Create an account</Link>
        </p>
      </form>
    </AuthShell>
  );
}
