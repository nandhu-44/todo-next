import { fail, json, requireUser } from "@/lib/auth";
import { SCOPES, generateKey, newKeyId, publicKey, utcDay, type Scope } from "@/lib/apiKeys";
import { getDb, type ApiKeyDoc } from "@/lib/db";
import { limits } from "@/lib/limits";
import { allow } from "@/lib/rateLimit";
import { recentUsage } from "@/lib/usage";

/** The signed-in user's keys with today's usage, the last 7 days, and the limits that apply. */
export async function GET() {
  const a = await requireUser();
  if ("res" in a) return a.res;
  const db = await getDb();
  const keys = (await db.apiKeys.find({ userId: a.user.id })).sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  const usage = await recentUsage(keys.map((k) => k.id), 7);
  const l = limits();
  const today = utcDay();
  return json({
    keys: keys.map((k) => {
      const days = usage.get(k.id)!;
      const limit = Math.min(k.dailyLimit ?? l.perDay, l.perDay);
      return { ...publicKey(k), usage: { today: days.find((d) => d.day === today)?.count ?? 0, limit, days } };
    }),
    limits: { keys: l.keysPerUser, perMinute: l.perMinute, perDay: l.perDay },
  });
}

/** Creates a key. The full secret is returned once and never again. */
export async function POST(req: Request) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  if (!allow(`key-create:${a.user.id}`, 10, 60 * 60_000)) return fail("Too many keys created recently. Try again later.", 429);

  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? "").trim();
  if (!name || name.length > 40) return fail("Give the key a name (up to 40 characters).");
  const scopes = Array.isArray(b?.scopes) ? [...new Set((b.scopes as unknown[]).filter((s): s is Scope => SCOPES.includes(s as Scope)))] : [];
  if (scopes.length === 0) return fail("Choose at least one permission.");
  const days = b?.expiresInDays;
  if (days !== null && days !== undefined && ![7, 30, 90, 365].includes(days)) return fail("Invalid expiry.");
  const l = limits();
  let dailyLimit: number | null = null;
  if (b?.dailyLimit !== null && b?.dailyLimit !== undefined && b?.dailyLimit !== "") {
    const n = Number(b.dailyLimit);
    if (!Number.isInteger(n) || n < 1 || n > l.perDay) return fail(`Daily limit must be a whole number from 1 to ${l.perDay}.`);
    dailyLimit = n;
  }

  const db = await getDb();
  if ((await db.apiKeys.count({ userId: a.user.id })) >= l.keysPerUser) return fail(`You can have at most ${l.keysPerUser} API keys. Delete one to make room.`, 403);

  const { secret, prefix, hash } = generateKey();
  const key: ApiKeyDoc = {
    id: newKeyId(), userId: a.user.id, name, prefix, hash, scopes, dailyLimit,
    createdAt: new Date().toISOString(), lastUsedAt: null,
    expiresAt: days ? new Date(Date.now() + days * 86_400_000).toISOString() : null,
  };
  await db.apiKeys.insert(key);
  return json({ key: publicKey(key), secret }, 201);
}
