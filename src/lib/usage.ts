import { getDb } from "./db";
import { utcDay } from "./apiKeys";

export interface DayCount { day: string; count: number }

/** Request counts per day for the last `days` days (oldest first, zeros filled in) for each given key. */
export async function recentUsage(keyIds: string[], days = 7): Promise<Map<string, DayCount[]>> {
  const db = await getDb();
  const wanted = Array.from({ length: days }, (_, i) => utcDay(new Date(Date.now() - (days - 1 - i) * 86_400_000)));
  const out = new Map<string, DayCount[]>();
  await Promise.all(
    keyIds.map(async (id) => {
      const docs = await db.apiUsage.find({ keyId: id });
      const byDay = new Map(docs.map((d) => [d.day, d.count]));
      out.set(id, wanted.map((day) => ({ day, count: byDay.get(day) ?? 0 })));
    }),
  );
  return out;
}
