import { fail, json, requireUser, setAppearanceCookie, toPublic } from "@/lib/auth";
import { parseAppearance } from "@/lib/appearance";
import { getDb } from "@/lib/db";

/** Saves the account's font / theme / radius (validated against a whitelist) and refreshes this device's cookie. */
export async function PUT(req: Request) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail("Invalid appearance");
  const appearance = parseAppearance(body);
  await (await getDb()).users.update(a.user.id, { appearance });
  await setAppearanceCookie(appearance);
  return json({ user: toPublic({ ...a.user, appearance }) });
}
