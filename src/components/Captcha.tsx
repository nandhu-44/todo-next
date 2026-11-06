"use client";
import { Check, Loader2, RotateCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CaptchaConfig } from "@/lib/captcha";
import { api } from "@/lib/api";

interface Props {
  config: CaptchaConfig;
  /** called with a token when the check is passed, and with null whenever it is not valid (yet / any more) */
  onToken: (token: string | null) => void;
  /** bump this to throw the current token away and run a fresh check (each token works only once) */
  resetKey?: number;
}

interface PowChallenge { algorithm: "SHA-256"; challenge: string; salt: string; signature: string; maxnumber: number }

/** Runs the built-in proof-of-work: find the number n with sha256(salt + n) === challenge. Done in the background while the user types. */
async function solve(c: PowChallenge, cancelled: () => boolean): Promise<number | null> {
  const enc = new TextEncoder();
  const target = new Uint8Array(c.challenge.match(/../g)!.map((h) => parseInt(h, 16)));
  const BATCH = 500;
  for (let start = 0; start <= c.maxnumber; start += BATCH) {
    if (cancelled()) return null;
    const count = Math.min(BATCH, c.maxnumber - start + 1);
    const digests = await Promise.all(Array.from({ length: count }, (_, i) => crypto.subtle.digest("SHA-256", enc.encode(c.salt + (start + i)))));
    for (let i = 0; i < count; i++) {
      const d = new Uint8Array(digests[i]);
      if (d[0] === target[0] && d[1] === target[1] && d.every((b, k) => b === target[k])) return start + i;
    }
  }
  return null;
}

export default function Captcha({ config, onToken, resetKey = 0 }: Props) {
  if (config.provider === "off") return null;
  return config.provider === "turnstile" ? <TurnstileBox siteKey={config.siteKey!} onToken={onToken} resetKey={resetKey} /> : <PowBox onToken={onToken} resetKey={resetKey} />;
}

function Status({ state, onRetry }: { state: "working" | "done" | "error"; onRetry?: () => void }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm">
      {state === "working" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      {state === "done" && <Check className="size-4 text-primary" strokeWidth={3} />}
      {state === "error" && <ShieldCheck className="size-4 text-destructive" />}
      <span className={state === "error" ? "text-destructive" : "text-muted-foreground"}>
        {state === "working" ? "Checking that you're human…" : state === "done" ? "You're verified" : "The security check failed."}
      </span>
      {state === "error" && onRetry && (
        <button type="button" onClick={onRetry} className="ml-auto flex items-center gap-1 text-primary hover:underline"><RotateCw className="size-3.5" /> Try again</button>
      )}
    </div>
  );
}

function PowBox({ onToken, resetKey = 0 }: Omit<Props, "config">) {
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [attempt, setAttempt] = useState(0);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    let stop = false;
    let refresh: ReturnType<typeof setTimeout> | undefined;
    setState("working");
    onTokenRef.current(null);
    (async () => {
      try {
        const c = await api<PowChallenge & { provider: string }>("/api/captcha");
        const n = await solve(c, () => stop);
        if (stop) return;
        if (n === null) throw new Error("unsolved");
        onTokenRef.current(btoa(JSON.stringify({ algorithm: c.algorithm, challenge: c.challenge, salt: c.salt, signature: c.signature, number: n })));
        setState("done");
        // a solution expires after 5 minutes; quietly get a fresh one before that happens
        refresh = setTimeout(() => setAttempt((a) => a + 1), 4 * 60_000);
      } catch {
        if (!stop) { setState("error"); onTokenRef.current(null); }
      }
    })();
    return () => { stop = true; clearTimeout(refresh); };
  }, [resetKey, attempt]);

  return <Status state={state} onRetry={() => setAttempt((a) => a + 1)} />;
}

declare global {
  interface Window { turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void; remove: (id?: string) => void } }
}

function TurnstileBox({ siteKey, onToken, resetKey = 0 }: { siteKey: string } & Omit<Props, "config">) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  const mount = useCallback(() => {
    if (!box.current || !window.turnstile || widget.current) return;
    widget.current = window.turnstile.render(box.current, {
      sitekey: siteKey,
      theme: "auto",
      callback: (t: string) => onTokenRef.current(t),
      "expired-callback": () => onTokenRef.current(null),
      "error-callback": () => onTokenRef.current(null),
    });
  }, [siteKey]);

  useEffect(() => {
    if (window.turnstile) { mount(); }
    else {
      let s = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
      if (!s) {
        s = document.createElement("script");
        s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        s.async = true;
        s.dataset.turnstile = "1";
        document.head.appendChild(s);
      }
      s.addEventListener("load", mount);
    }
    return () => { if (widget.current) { window.turnstile?.remove(widget.current); widget.current = undefined; } };
  }, [mount]);

  // a spent token can't be reused, so a reset request gets a brand-new challenge
  useEffect(() => {
    if (resetKey > 0 && widget.current) { onTokenRef.current(null); window.turnstile?.reset(widget.current); }
  }, [resetKey]);

  return <div ref={box} className="flex min-h-[65px] justify-center" />;
}
