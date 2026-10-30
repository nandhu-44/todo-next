import { fail, json, requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { parseTodo, toTodo } from "@/lib/todoInput";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  const { id } = await params;
  const db = await getDb();
  const todo = await db.todos.findOne({ id, userId: a.user.id });
  if (!todo) return fail("Todo not found", 404);

  const input = parseTodo(await req.json().catch(() => null), false);
  if (typeof input === "string") return fail(input);

  const patch = { ...input, updatedAt: new Date().toISOString(), ...(input.completed !== undefined && input.completed !== todo.completed
    ? { completedAt: input.completed ? new Date().toISOString() : null }
    : {}) };
  await db.todos.update(id, patch);
  return json({ todo: toTodo({ ...todo, ...patch }) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  const { id } = await params;
  const n = await (await getDb()).todos.remove({ id, userId: a.user.id });
  return n ? json({ ok: true }) : fail("Todo not found", 404);
}
