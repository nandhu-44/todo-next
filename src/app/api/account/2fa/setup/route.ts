import { fail, json, requireUser } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { newSecret, setupPayload } from "@/lib/totp";

/** Step 1: generate a secret + QR code. Nothing is enforced until /enable confirms a code. */
export async function POST() {
  const a = await requireUser();
  if ("res" in a) return a.res;
  if (a.user.totpEnabled) return fail("Two-factor is already enabled", 409);

  const secret = newSecret();
  await (await getDb()).users.update(a.user.id, { totpPending: encrypt(secret) });
  return json(await setupPayload(secret, a.user.email));
}
