import bcrypt from "bcryptjs";
import { destroySession, fail, json, requireUser, toPublic } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { allow, clientIp } from "@/lib/rateLimit";

export async function PATCH(req: Request) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  const name = String((await req.json().catch(() => null))?.name ?? "").trim();
  if (!name || name.length > 60) return fail("Please enter a name (max 60 characters)");
  await (await getDb()).users.update(a.user.id, { name });
  return json({ user: toPublic({ ...a.user, name }) });
}

/** Permanently deletes the account and all of its todos. */
export async function DELETE(req: Request) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  if (!allow(`delete:${clientIp(req)}:${a.user.id}`, 5, 15 * 60_000)) return fail("Too many attempts", 429);

  const b = await req.json().catch(() => null);
  if (String(b?.confirm ?? "").trim().toLowerCase() !== a.user.email) return fail("Type your email address to confirm");
  if (a.user.passwordHash && !(await bcrypt.compare(String(b?.password ?? ""), a.user.passwordHash)))
    return fail("Incorrect password", 403);

  const db = await getDb();
  await db.todos.remove({ userId: a.user.id });
  await db.resets.remove({ userId: a.user.id });
  await db.users.remove({ id: a.user.id });
  await destroySession();
  return json({ ok: true });
}
