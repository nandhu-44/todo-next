import { randomUUID } from "crypto";
import { fail, json, requireUser } from "@/lib/auth";
import { getDb, type TodoDoc } from "@/lib/db";
import { parseTodo, toTodo } from "@/lib/todoInput";


export async function GET() {
  const a = await requireUser();
  if ("res" in a) return a.res;
  const todos = await (await getDb()).todos.find({ userId: a.user.id });
  return json({ todos: todos.sort((x, y) => x.order - y.order).map(toTodo) });
}

export async function POST(req: Request) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  const body = await req.json().catch(() => null);
  const input = parseTodo(body, true);
  if (typeof input === "string") return fail(input);

  const db = await getDb();
  const mine = await db.todos.find({ userId: a.user.id });
  // Restoring a deleted todo (undo) keeps its original id/order/createdAt.
  const restore = body?.restore;
  const id = typeof restore?.id === "string" && /^[\w-]{8,64}$/.test(restore.id) ? restore.id : randomUUID();
  if (mine.some((t) => t.id === id)) return fail("Todo already exists", 409);

  const todo: TodoDoc = {
    id,
    userId: a.user.id,
    title: input.title!,
    description: input.description ?? "",
    completed: input.completed ?? false,
    priority: input.priority ?? "medium",
    dueDate: input.dueDate ?? null,
    tags: input.tags ?? [],
    order: typeof restore?.order === "number" ? restore.order : Math.min(0, ...mine.map((t) => t.order)) - 1,
    createdAt:
      typeof restore?.createdAt === "string" && !isNaN(Date.parse(restore.createdAt))
        ? restore.createdAt
        : new Date().toISOString(),
    completedAt: input.completed ? new Date().toISOString() : null,
  };
  await db.todos.insert(todo);
  return json({ todo: toTodo(todo) }, 201);
}
