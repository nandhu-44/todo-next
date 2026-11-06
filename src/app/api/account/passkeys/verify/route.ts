import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { fail, json, requireUser } from "@/lib/auth";
import { DuplicateError, getDb, type PasskeyDoc } from "@/lib/db";
import { MAX_PASSKEYS, relyingParty, takeChallenge, toB64 } from "@/lib/webauthn";

/** Step 2: check what the device sent back and store its PUBLIC key. */
export async function POST(req: Request) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  const body = await req.json().catch(() => null);
  const saved = await takeChallenge("register");
  if (!saved || saved.userId !== a.user.id) return fail("That request expired. Please try adding the passkey again.", 400);
  if (!body?.response) return fail("Invalid request");

  const { origin, rpID } = relyingParty(req);
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: saved.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch (e) {
    console.warn("[passkey] registration rejected:", (e as Error).message);
    return fail("Your device's response couldn't be verified. Please try again.", 400);
  }
  if (!verification.verified || !verification.registrationInfo) return fail("Couldn't verify the passkey.", 400);

  const db = await getDb();
  if ((await db.passkeys.count({ userId: a.user.id })) >= MAX_PASSKEYS) return fail(`You can have at most ${MAX_PASSKEYS} passkeys.`, 403);
  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  const doc: PasskeyDoc = {
    id: credential.id,
    userId: a.user.id,
    name: String(body.name ?? "").trim().slice(0, 40) || `Passkey ${new Date().toLocaleDateString("en-GB")}`,
    publicKey: toB64(credential.publicKey),
    counter: credential.counter,
    transports: (credential.transports as string[] | undefined) ?? [],
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  };
  try {
    await db.passkeys.insert(doc);
  } catch (e) {
    if (e instanceof DuplicateError) return fail("This passkey is already registered.", 409);
    throw e;
  }
  return json({ passkey: { id: doc.id, name: doc.name, createdAt: doc.createdAt, lastUsedAt: null, deviceType: doc.deviceType, backedUp: doc.backedUp, transports: doc.transports } }, 201);
}
