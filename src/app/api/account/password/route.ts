import bcrypt from "bcryptjs";
import { fail, json, requireUser, toPublic } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { allow, clientIp } from "@/lib/rateLimit";

/** Change the password, or set one for the first time on a Google-only account. */
export async function POST(req: Request) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  if (!allow(`pw:${clientIp(req)}:${a.user.id}`, 6, 15 * 60_000)) return fail("Too many attempts", 429);

  const b = await req.json().catch(() => null);
  const next = String(b?.next ?? "");
  if (next.length < 8) return fail("New password must be at least 8 characters");
  if (a.user.passwordHash && !(await bcrypt.compare(String(b?.current ?? ""), a.user.passwordHash)))
    return fail("Current password is incorrect", 403);

  const passwordHash = await bcrypt.hash(next, 10);
  await (await getDb()).users.update(a.user.id, { passwordHash });
  return json({ user: toPublic({ ...a.user, passwordHash }) });
}
