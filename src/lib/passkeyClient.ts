import { browserSupportsWebAuthn } from "@simplewebauthn/browser";

export const supportsPasskeys = () => typeof window !== "undefined" && browserSupportsWebAuthn();

/** Turns the errors the browser/library throw into something a person can act on. */
export function passkeyError(err: unknown): string {
  const e = err as { name?: string; message?: string; code?: string };
  switch (e?.name) {
    case "NotAllowedError":
      return "That was cancelled or timed out. Please try again.";
    case "InvalidStateError":
      return "This device already has a passkey for your account.";
    case "SecurityError":
      return "Passkeys only work on the site's real https address.";
    case "NotSupportedError":
      return "This device or browser can't create that kind of passkey.";
    case "AbortError":
      return "The request was interrupted. Please try again.";
  }
  return e?.message || "Something went wrong with the passkey.";
}
