import { fail, json, requireUser, toPublic } from "@/lib/auth";
import { getDb } from "@/lib/db";

/** Disconnect Google. Only allowed once a password exists, so the account can't be locked out. */
export async function POST() {
  const a = await requireUser();
  if ("res" in a) return a.res;
  if (!a.user.googleId) return fail("Google isn't connected", 400);
  if (!a.user.passwordHash) return fail("Set a password first so you can still sign in", 400);
  await (await getDb()).users.update(a.user.id, { googleId: null });
  return json({ user: toPublic({ ...a.user, googleId: null }) });
}
