import { fail, json, requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

/** Revokes (deletes) a key immediately, along with its usage history. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  const { id } = await params;
  const db = await getDb();
  const key = await db.apiKeys.findOne({ id, userId: a.user.id });
  if (!key) return fail("Key not found", 404);
  await db.apiKeys.remove({ id });
  await db.apiUsage.remove({ keyId: id });
  return json({ ok: true });
}
