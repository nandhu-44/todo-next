import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { signingKey } from "./google";
import { requestOrigin } from "./origin";

export const RP_NAME = "ToDo Next";
export const MAX_PASSKEYS = 10;
const CHALLENGE_COOKIE = "todo_webauthn";

/**
 * Where passkeys are valid. A passkey is bound to the site's domain (the "relying party id"), so one created on
 * example.com can never be used on a look-alike site. Derived from the request unless pinned with
 * WEBAUTHN_RP_ID / WEBAUTHN_ORIGIN (recommended in production). Preview deployments get their own domain,
 * so passkeys made on the production domain do not work there.
 */
export function relyingParty(req: Request) {
  const origin = process.env.WEBAUTHN_ORIGIN || requestOrigin(req);
  const rpID = process.env.WEBAUTHN_RP_ID || new URL(origin).hostname;
  return { origin, rpID };
}

export const toB64 = (b: Uint8Array) => Buffer.from(b).toString("base64url");
export const fromB64 = (s: string) => new Uint8Array(Buffer.from(s, "base64url"));

/* The challenge is remembered in a short-lived signed cookie (no server state, works across serverless instances).
   It is deleted the moment it is read, so each challenge can be answered exactly once. */
export async function saveChallenge(purpose: "register" | "login", challenge: string, userId?: string) {
  const token = await new SignJWT({ challenge, purpose, userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("5m")
    .sign(signingKey());
  (await cookies()).set(CHALLENGE_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/api",
    maxAge: 300,
  });
}

export async function takeChallenge(purpose: "register" | "login"): Promise<{ challenge: string; userId?: string } | null> {
  const jar = await cookies();
  const token = jar.get(CHALLENGE_COOKIE)?.value;
  jar.delete({ name: CHALLENGE_COOKIE, path: "/api" });
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey());
    if (payload.purpose !== purpose || typeof payload.challenge !== "string") return null;
    return { challenge: payload.challenge, userId: typeof payload.userId === "string" ? payload.userId : undefined };
  } catch {
    return null;
  }
}
