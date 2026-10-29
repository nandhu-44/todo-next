"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Six-box one-time-code input: auto-advance, paste support, calls onComplete when full. */
export function OtpInput({ onComplete, disabled, autoFocus, resetKey }: { onComplete: (code: string) => void; disabled?: boolean; autoFocus?: boolean; resetKey?: number }) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setDigits(Array(6).fill(""));
    if (autoFocus) refs.current[0]?.focus();
  }, [resetKey, autoFocus]);

  const set = (next: string[]) => {
    setDigits(next);
    if (next.every(Boolean)) onComplete(next.join(""));
  };

  return (
    <div className="flex justify-center gap-2" role="group" aria-label="One-time code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => void (refs.current[i] = el)}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
          maxLength={1}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(-1);
            const next = [...digits];
            next[i] = v;
            set(next);
            if (v && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (!text) return;
            e.preventDefault();
            const next = Array.from({ length: 6 }, (_, k) => text[k] ?? "");
            set(next);
            refs.current[Math.min(text.length, 5)]?.focus();
          }}
          className={cn(
            "heading size-11 rounded-xl border border-border bg-background/60 text-center text-xl outline-none transition sm:size-12",
            "focus:border-primary focus:ring-4 focus:ring-primary/20 disabled:opacity-60",
          )}
        />
      ))}
    </div>
  );
}
