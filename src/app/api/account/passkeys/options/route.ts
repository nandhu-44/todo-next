import { generateRegistrationOptions } from "@simplewebauthn/server";
import { fail, json, requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { allow, clientIp } from "@/lib/rateLimit";
import { MAX_PASSKEYS, RP_NAME, relyingParty, saveChallenge } from "@/lib/webauthn";

/** Step 1 of adding a passkey: the browser asks the device to create a new keypair for this site. */
export async function POST(req: Request) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  if (!allow(`pk-reg:${clientIp(req)}:${a.user.id}`, 20, 10 * 60_000)) return fail("Too many attempts. Try again in a few minutes.", 429);

  const existing = await (await getDb()).passkeys.find({ userId: a.user.id });
  if (existing.length >= MAX_PASSKEYS) return fail(`You can have at most ${MAX_PASSKEYS} passkeys. Remove one first.`, 403);

  const { rpID } = relyingParty(req);
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: a.user.email,
    userDisplayName: a.user.name,
    userID: new TextEncoder().encode(a.user.id), // a stable handle that carries no personal data
    attestationType: "none", // we don't need to know which authenticator model it is
    excludeCredentials: existing.map((p) => ({ id: p.id, transports: p.transports })), // stops adding the same device twice
    authenticatorSelection: { residentKey: "required", userVerification: "required" }, // discoverable, needs PIN/biometric
  });
  await saveChallenge("register", options.challenge, a.user.id);
  return json(options);
}
