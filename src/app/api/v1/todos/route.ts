import { randomUUID } from "crypto";
import { apiError, apiResponse, preflight, v1 } from "@/lib/apiKeys";
import { getDb, type TodoDoc } from "@/lib/db";
import { limits } from "@/lib/limits";
import { parseTodo, toTodo } from "@/lib/todoInput";
import { daysUntil } from "@/lib/dates";

const PRIO = { high: 0, medium: 1, low: 2 } as const;
const bool = (v: string | null) => (v === "true" ? true : v === "false" ? false : undefined);
const int = (v: string | null, d: number, min: number, max: number) => {
  const n = v === null ? d : Number(v);
  return Number.isInteger(n) ? Math.min(max, Math.max(min, n)) : d;
};

export const OPTIONS = preflight;

/** GET /api/v1/todos: filter, sort and page through your todos. */
export const GET = v1("todos:read", async ({ req, userId }) => {
  const q = new URL(req.url).searchParams;
  const completed = bool(q.get("completed"));
  const priority = q.get("priority");
  const tag = q.get("tag")?.toLowerCase();
  const text = q.get("q")?.trim().toLowerCase();
  const dueBefore = q.get("due_before"); // YYYY-MM-DD, inclusive
  const dueAfter = q.get("due_after");
  const overdue = bool(q.get("overdue"));
  const sort = q.get("sort") ?? "order";
  const dir = q.get("direction") === "desc" ? -1 : 1;
  if (priority && !(priority in PRIO)) return apiError("invalid_parameter", "priority must be low, medium or high.", 400);
  if (!["order", "created", "updated", "due", "priority", "title"].includes(sort)) return apiError("invalid_parameter", "Unknown sort field.", 400);
  for (const d of [dueBefore, dueAfter]) if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return apiError("invalid_parameter", "Dates must look like 2026-12-31.", 400);

  const all = (await (await getDb()).todos.find({ userId })).map(toTodo);
  let list = all.filter((t) =>
    (completed === undefined || t.completed === completed) &&
    (!priority || t.priority === priority) &&
    (!tag || t.tags.includes(tag)) &&
    (!text || t.title.toLowerCase().includes(text) || t.description.toLowerCase().includes(text)) &&
    (!dueBefore || (t.dueDate !== null && t.dueDate <= dueBefore)) &&
    (!dueAfter || (t.dueDate !== null && t.dueDate >= dueAfter)) &&
    (overdue === undefined || (overdue === (!t.completed && t.dueDate !== null && daysUntil(t.dueDate) < 0))),
  );
  list = list.sort((a, b) => {
    switch (sort) {
      case "created": return dir * a.createdAt.localeCompare(b.createdAt);
      case "updated": return dir * a.updatedAt.localeCompare(b.updatedAt);
      case "due": return dir * (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
      case "priority": return dir * (PRIO[a.priority] - PRIO[b.priority]);
      case "title": return dir * a.title.localeCompare(b.title);
      default: return dir * (a.order - b.order);
    }
  });
  const limit = int(q.get("limit"), 50, 1, 200);
  const offset = int(q.get("offset"), 0, 0, 1_000_000);
  return apiResponse({ data: list.slice(offset, offset + limit), total: list.length, limit, offset });
});

/** POST /api/v1/todos: create a todo. */
export const POST = v1("todos:write", async ({ req, userId }) => {
  const input = parseTodo(await req.json().catch(() => null), true);
  if (typeof input === "string") return apiError("invalid_body", input, 400);

  const db = await getDb();
  const mine = await db.todos.find({ userId });
  const max = limits().todosPerUser;
  if (mine.length >= max) return apiError("todo_limit_reached", `This account is at its limit of ${max} todos.`, 403);

  const now = new Date().toISOString();
  const todo: TodoDoc = {
    id: randomUUID(), userId,
    title: input.title!, description: input.description ?? "", completed: input.completed ?? false,
    priority: input.priority ?? "medium", dueDate: input.dueDate ?? null, tags: input.tags ?? [],
    order: Math.min(0, ...mine.map((t) => t.order)) - 1,
    createdAt: now, updatedAt: now, completedAt: input.completed ? now : null,
  };
  await db.todos.insert(todo);
  return apiResponse({ data: toTodo(todo) }, 201, { Location: `/api/v1/todos/${todo.id}` });
});
