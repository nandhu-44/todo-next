import { apiError, apiResponse, preflight, v1 } from "@/lib/apiKeys";
import { getDb } from "@/lib/db";
import { parseTodo, toTodo } from "@/lib/todoInput";

export const OPTIONS = preflight;

export const GET = v1("todos:read", async ({ userId, params }) => {
  const todo = await (await getDb()).todos.findOne({ id: params.id, userId });
  return todo ? apiResponse({ data: toTodo(todo) }) : apiError("not_found", "No todo with that id.", 404);
});

/** PATCH: send only the fields you want to change. */
export const PATCH = v1("todos:write", async ({ req, userId, params }) => {
  const db = await getDb();
  const todo = await db.todos.findOne({ id: params.id, userId });
  if (!todo) return apiError("not_found", "No todo with that id.", 404);
  const input = parseTodo(await req.json().catch(() => null), false);
  if (typeof input === "string") return apiError("invalid_body", input, 400);
  if (Object.keys(input).length === 0) return apiError("invalid_body", "Send at least one field to change.", 400);

  const now = new Date().toISOString();
  const patch = {
    ...input,
    updatedAt: now,
    ...(input.completed !== undefined && input.completed !== todo.completed ? { completedAt: input.completed ? now : null } : {}),
  };
  await db.todos.update(todo.id, patch);
  return apiResponse({ data: toTodo({ ...todo, ...patch }) });
});

export const DELETE = v1("todos:write", async ({ userId, params }) => {
  const removed = await (await getDb()).todos.remove({ id: params.id, userId });
  return removed ? apiResponse(null, 204) : apiError("not_found", "No todo with that id.", 404);
});
