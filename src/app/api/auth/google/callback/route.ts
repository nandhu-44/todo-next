import { randomUUID } from "crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearPending, createPending, createSession, getUser } from "@/lib/auth";
import { DuplicateError, getDb, type UserDoc } from "@/lib/db";
import { normalizeEmail } from "@/lib/email";
import { googleConfig, oauthCookie, signingKey } from "@/lib/google";

const jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cfg = googleConfig(req);
  const to = (path: string) => NextResponse.redirect(new URL(path, cfg?.base ?? url.origin));
  if (!cfg) return to("/signin?error=google_unavailable");

  const jar = await cookies();
  const saved = jar.get(oauthCookie)?.value;
  jar.delete({ name: oauthCookie, path: "/api/auth/google" });

  if (url.searchParams.get("error")) return to("/signin?error=google_denied");
  const code = url.searchParams.get("code");
  if (!saved || !code) return to("/signin?error=google_failed");

  try {
    const { payload: ctx } = await jwtVerify(saved, signingKey());
    if (ctx.state !== url.searchParams.get("state")) return to("/signin?error=google_failed");

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: cfg.redirectUri,
        grant_type: "authorization_code",
        code_verifier: String(ctx.verifier),
      }),
    });
    if (!tokenRes.ok) return to("/signin?error=google_failed");
    const { id_token } = await tokenRes.json();

    const { payload: g } = await jwtVerify(id_token, jwks, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: cfg.clientId,
    });
    const email = normalizeEmail(String(g.email ?? ""));
    if (!g.sub || !email || g.email_verified !== true) return to("/signin?error=google_unverified");

    const db = await getDb();

    // Linking from settings: attach this Google identity to the signed-in account (emails must match).
    if (ctx.linkUserId) {
      const me = await getUser();
      if (!me || me.id !== ctx.linkUserId) return to("/signin");
      const owner = await db.users.findOne({ googleId: g.sub } as Partial<UserDoc>);
      if (owner && owner.id !== me.id) return to("/settings?error=google_taken");
      if (email !== me.email) return to("/settings?error=google_email_mismatch");
      if (me.googleId && me.googleId !== g.sub) return to("/settings?error=google_conflict");
      await db.users.update(me.id, { googleId: g.sub });
      return to("/settings?linked=1");
    }

    // Email is the account key: find by Google id first, then by email, and only then create.
    let user = await db.users.findOne({ googleId: g.sub } as Partial<UserDoc>);
    if (!user) {
      const existing = await db.users.findOne({ email });
      if (existing) {
        if (existing.googleId && existing.googleId !== g.sub) return to("/signin?error=google_conflict");
        // Google verified this address, so it's safe to attach to the existing (password) account.
        await db.users.update(existing.id, { googleId: g.sub });
        user = { ...existing, googleId: g.sub };
      } else {
        const fresh: UserDoc = {
          id: randomUUID(),
          name: String(g.name || email.split("@")[0]).slice(0, 60),
          email,
          passwordHash: null,
          googleId: g.sub,
          createdAt: new Date().toISOString(),
        };
        try {
          await db.users.insert(fresh);
          user = fresh;
        } catch (e) {
          if (!(e instanceof DuplicateError)) throw e;
          // a concurrent request created it first
          user = await db.users.findOne({ email });
          if (!user) throw e;
        }
      }
    }

    const remember = ctx.remember !== false;
    if (user.totpEnabled) {
      await createPending(user.id, remember);
      return to("/two-factor");
    }
    await clearPending();
    await createSession(user.id, remember);
    return to("/");
  } catch (e) {
    console.error("Google sign-in failed", e);
    return to("/signin?error=google_failed");
  }
}
