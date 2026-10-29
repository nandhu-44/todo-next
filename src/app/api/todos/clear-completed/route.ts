import { json, requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST() {
  const a = await requireUser();
  if ("res" in a) return a.res;
  const removed = await (await getDb()).todos.remove({ userId: a.user.id, completed: true });
  return json({ removed });
}
