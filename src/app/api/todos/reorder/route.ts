import { fail, json, requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(req: Request) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  const b = await req.json().catch(() => null);
  if (!Array.isArray(b?.ids) || b.ids.some((i: unknown) => typeof i !== "string")) return fail("Invalid ids");

  const db = await getDb();
  const mine = new Set((await db.todos.find({ userId: a.user.id })).map((t) => t.id));
  const ids = (b.ids as string[]).filter((id) => mine.has(id));
  await Promise.all(ids.map((id, i) => db.todos.update(id, { order: i })));
  return json({ ok: true });
}
