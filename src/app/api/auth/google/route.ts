import { createHash, randomBytes } from "crypto";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { googleConfig, oauthCookie, signingKey } from "@/lib/google";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cfg = googleConfig(req);
  if (!cfg) return NextResponse.redirect(new URL("/signin?error=google_unavailable", url.origin));

  const state = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const remember = url.searchParams.get("remember") !== "0";

  const jwt = await new SignJWT({ state, verifier, remember })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m")
    .sign(signingKey());
  (await cookies()).set(oauthCookie, jwt, {
    httpOnly: true,
    sameSite: "lax", // must survive the redirect back from Google
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: 600,
  });

  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.search = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return NextResponse.redirect(auth);
}
