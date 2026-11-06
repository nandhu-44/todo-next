import { apiResponse, preflight, v1 } from "@/lib/apiKeys";
import { getDb } from "@/lib/db";

export const OPTIONS = preflight;

/** POST: delete every completed todo. Returns how many were removed. */
export const POST = v1("todos:write", async ({ userId }) => {
  const removed = await (await getDb()).todos.remove({ userId, completed: true });
  return apiResponse({ removed });
});
