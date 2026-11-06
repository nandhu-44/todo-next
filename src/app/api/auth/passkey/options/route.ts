import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { fail, json } from "@/lib/auth";
import { allow, clientIp } from "@/lib/rateLimit";
import { relyingParty, saveChallenge } from "@/lib/webauthn";

/**
 * Step 1 of signing in with a passkey. No email is needed: the device offers the passkeys it holds for this site
 * ("discoverable credentials"), so there is also no way to learn whether an email has an account from here.
 */
export async function POST(req: Request) {
  if (!allow(`pk-opt:${clientIp(req)}`, 30, 10 * 60_000)) return fail("Too many attempts. Try again in a few minutes.", 429);
  const options = await generateAuthenticationOptions({ rpID: relyingParty(req).rpID, userVerification: "required" });
  await saveChallenge("login", options.challenge);
  return json(options);
}
