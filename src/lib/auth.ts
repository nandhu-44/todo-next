import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb, type UserDoc } from "./db";
import { APPEARANCE_COOKIE, parseAppearance } from "./appearance";
import type { PublicUser } from "./types";

const COOKIE = "todo_session";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is not set");
    return new TextEncoder().encode("dev-only-insecure-secret-change-me");
  }
  return new TextEncoder().encode(s);
}

export const toPublic = (u: UserDoc): PublicUser => ({
  id: u.id,
  name: u.name,
  email: u.email,
  hasPassword: !!u.passwordHash,
  google: !!u.googleId,
  totpEnabled: !!u.totpEnabled,
  recoveryLeft: u.recoveryCodes?.length ?? 0,
  appearance: parseAppearance(u.appearance),
});

/** Device cookie holding the appearance, so the very first server-rendered paint is already themed. */
export async function setAppearanceCookie(appearance: unknown) {
  (await cookies()).set(APPEARANCE_COOKIE, JSON.stringify(parseAppearance(appearance)), {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function createSession(userId: string, remember: boolean) {
  // signing in on a new device brings the account's saved appearance along
  const account = await (await getDb()).users.findOne({ id: userId });
  if (account?.appearance) await setAppearanceCookie(account.appearance);
  const days = remember ? 30 : 1;
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // session cookie when "remember me" is off
    ...(remember ? { maxAge: days * 86400 } : {}),
  });
}

/* A short-lived cookie proving the password (or Google) step passed; the 2FA code finishes the login. */
const PENDING = "todo_2fa";

export async function createPending(userId: string, remember: boolean) {
  const token = await new SignJWT({ purpose: "2fa", remember })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setExpirationTime("5m")
    .sign(secret());
  (await cookies()).set(PENDING, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 300,
  });
}

export async function readPending(): Promise<{ userId: string; remember: boolean } | null> {
  const token = (await cookies()).get(PENDING)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== "2fa" || !payload.sub) return null;
    return { userId: payload.sub, remember: payload.remember === true };
  } catch {
    return null;
  }
}

export async function clearPending() {
  (await cookies()).delete(PENDING);
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getUser(): Promise<UserDoc | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return (await (await getDb()).users.findOne({ id: payload.sub })) ?? null;
  } catch {
    return null;
  }
}

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (message: string, status = 400) => json({ error: message }, status);

/** Resolve the signed-in user or return a 401 response. */
export async function requireUser(): Promise<{ user: UserDoc } | { res: NextResponse }> {
  const user = await getUser();
  return user ? { user } : { res: fail("Not signed in", 401) };
}
