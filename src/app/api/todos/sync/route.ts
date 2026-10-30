import { fail, json, requireUser } from "@/lib/auth";
import { getDb, type TodoDoc } from "@/lib/db";
import { allow } from "@/lib/rateLimit";
import { merge } from "@/lib/sync";
import { parseTodo, toTodo } from "@/lib/todoInput";
import type { Todo } from "@/lib/types";

const MAX = 5000;
const ID = /^[\w-]{8,64}$/;
const isIso = (v: unknown): v is string => typeof v === "string" && !isNaN(Date.parse(v));

/** Validates an untrusted client todo into a full Todo (or null when unusable). */
function clean(raw: unknown): Todo | null {
  const r = raw as Record<string, unknown> | null;
  if (!r || typeof r.id !== "string" || !ID.test(r.id)) return null;
  const c = parseTodo(r, true);
  if (typeof c === "string") return null;
  const created = isIso(r.createdAt) ? r.createdAt : new Date().toISOString();
  return {
    id: r.id,
    title: c.title!,
    description: c.description ?? "",
    completed: c.completed ?? false,
    priority: c.priority ?? "medium",
    dueDate: c.dueDate ?? null,
    tags: c.tags ?? [],
    order: typeof r.order === "number" && isFinite(r.order) ? r.order : 0,
    createdAt: created,
    updatedAt: isIso(r.updatedAt) ? r.updatedAt : created,
    completedAt: isIso(r.completedAt) ? r.completedAt : null,
  };
}
const cleanAll = (v: unknown) => (Array.isArray(v) && v.length <= MAX ? v.map(clean) : null);

// Two devices syncing at the same moment must not interleave their read-merge-write.
const locks = new Map<string, Promise<unknown>>();
function exclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const run = (locks.get(key) ?? Promise.resolve()).then(fn, fn);
  const tail = run.catch(() => undefined);
  locks.set(key, tail);
  tail.then(() => locks.get(key) === tail && locks.delete(key));
  return run;
}

/**
 * Local-only mode sync: merges this device's todos with the server's using the snapshot taken at the
 * last sync (see lib/sync.ts), applies the result, and returns the merged list.
 */
export async function POST(req: Request) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  if (!allow(`sync:${a.user.id}`, 30, 10 * 60_000)) return fail("Syncing too often. Try again in a moment.", 429);

  const body = await req.json().catch(() => null);
  const base = cleanAll(body?.base);
  const local = cleanAll(body?.local);
  if (!base || !local) return fail("Invalid sync data");
  if (local.some((t) => !t) || base.some((t) => !t)) return fail("Some todos have invalid data and can't be synced");

  const userId = a.user.id;
  return exclusive(userId, async () => {
    const db = await getDb();
    const server = (await db.todos.find({ userId })).map(toTodo);
    const result = merge(base as Todo[], local as Todo[], server);

    // ids are global, so a client may not "create" a todo whose id belongs to someone else
    for (const t of result.toInsert) {
      if (await db.todos.findOne({ id: t.id })) return fail("Sync conflict: please reload and try again", 409);
    }
    for (const t of result.toInsert) await db.todos.insert({ ...t, userId } as TodoDoc);
    for (const t of result.toUpdate) {
      const { id, ...patch } = t;
      await db.todos.update(id, patch);
    }
    for (const id of result.toDelete) await db.todos.remove({ id, userId });
    return json({ todos: result.merged, stats: result.stats, syncedAt: new Date().toISOString() });
  });
}
