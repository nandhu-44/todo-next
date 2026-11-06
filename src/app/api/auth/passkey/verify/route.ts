import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { clearPending, createSession, fail, json, toPublic } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { allow, clientIp } from "@/lib/rateLimit";
import { fromB64, relyingParty, takeChallenge } from "@/lib/webauthn";

/**
 * Step 2: the device signed our challenge with the private key that never left it; we check the signature against the
 * stored public key. A passkey with a PIN/biometric is already two factors (device + you), so it skips the 2FA code.
 */
export async function POST(req: Request) {
  if (!allow(`pk-verify:${clientIp(req)}`, 20, 10 * 60_000)) return fail("Too many attempts. Try again in a few minutes.", 429);
  const body = await req.json().catch(() => null);
  const saved = await takeChallenge("login");
  const response = body?.response;
  if (!saved || typeof response?.id !== "string") return fail("That sign-in expired. Please try again.", 400);

  const db = await getDb();
  const passkey = await db.passkeys.findOne({ id: response.id });
  const user = passkey ? await db.users.findOne({ id: passkey.userId }) : null;
  if (!passkey || !user) return fail("That passkey isn't registered for this site.", 401);
  // the device also reports which account the passkey belongs to; it must agree with our records
  const handle = response.response?.userHandle;
  if (typeof handle === "string" && Buffer.from(handle, "base64url").toString() !== user.id) return fail("That passkey isn't registered for this site.", 401);

  const { origin, rpID } = relyingParty(req);
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: saved.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: { id: passkey.id, publicKey: fromB64(passkey.publicKey), counter: passkey.counter, transports: passkey.transports as never },
    });
  } catch (e) {
    console.warn("[passkey] sign-in rejected:", (e as Error).message);
    return fail("Your device's response couldn't be verified.", 401);
  }
  if (!verification.verified) return fail("Your device's response couldn't be verified.", 401);

  await db.passkeys.update(passkey.id, { counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date().toISOString() });
  await clearPending();
  await createSession(user.id, body?.remember !== false);
  return json({ user: toPublic(user) });
}
