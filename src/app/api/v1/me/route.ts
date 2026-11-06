import { apiError, apiResponse, preflight, publicKey, v1 } from "@/lib/apiKeys";
import { getDb } from "@/lib/db";
import { limits } from "@/lib/limits";

export const OPTIONS = preflight;

/** GET /api/v1/me: the account behind this key, the key itself and the limits that apply. */
export const GET = v1(null, async ({ userId, key }) => {
  const db = await getDb();
  const [user, todoCount] = await Promise.all([db.users.findOne({ id: userId }), db.todos.count({ userId })]);
  if (!user) return apiError("not_found", "Account not found.", 404);
  const l = limits();
  return apiResponse({
    user: { id: user.id, name: user.name, email: user.email },
    key: publicKey(key),
    todos: { count: todoCount, limit: l.todosPerUser },
    limits: { requestsPerMinute: l.perMinute, requestsPerDay: Math.min(key.dailyLimit ?? l.perDay, l.perDay) },
  });
});
