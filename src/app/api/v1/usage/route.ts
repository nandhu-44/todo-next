import { apiResponse, preflight, utcDay, v1 } from "@/lib/apiKeys";
import { limits } from "@/lib/limits";
import { recentUsage } from "@/lib/usage";

export const OPTIONS = preflight;

/** GET /api/v1/usage: how much of today's quota this key has used, plus the last 7 days. */
export const GET = v1(null, async ({ key }) => {
  const days = (await recentUsage([key.id], 7)).get(key.id)!;
  const limit = Math.min(key.dailyLimit ?? limits().perDay, limits().perDay);
  const today = days.find((d) => d.day === utcDay())?.count ?? 0;
  return apiResponse({ today: { used: today, limit, remaining: Math.max(0, limit - today), resetsAt: new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString() }, last7Days: days });
});
