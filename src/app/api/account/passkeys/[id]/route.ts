import { fail, json, requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  const { id } = await params;
  const name = String((await req.json().catch(() => null))?.name ?? "").trim();
  if (!name || name.length > 40) return fail("Give the passkey a name (up to 40 characters).");
  const db = await getDb();
  if (!(await db.passkeys.findOne({ id, userId: a.user.id }))) return fail("Passkey not found", 404);
  await db.passkeys.update(id, { name });
  return json({ ok: true });
}

/** Removes a passkey, but never the last way to sign in. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  const { id } = await params;
  const db = await getDb();
  if (!(await db.passkeys.findOne({ id, userId: a.user.id }))) return fail("Passkey not found", 404);
  const others = (await db.passkeys.count({ userId: a.user.id })) - 1;
  if (!a.user.passwordHash && !a.user.googleId && others < 1)
    return fail("This is your only way to sign in. Add a password or another passkey first.", 409);
  await db.passkeys.remove({ id, userId: a.user.id });
  return json({ ok: true });
}
