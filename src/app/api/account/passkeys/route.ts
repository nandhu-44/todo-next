import { json, requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

/** The signed-in user's passkeys (never the public key material). */
export async function GET() {
  const a = await requireUser();
  if ("res" in a) return a.res;
  const list = await (await getDb()).passkeys.find({ userId: a.user.id });
  return json({
    passkeys: list
      .sort((x, y) => y.createdAt.localeCompare(x.createdAt))
      .map((p) => ({ id: p.id, name: p.name, createdAt: p.createdAt, lastUsedAt: p.lastUsedAt, deviceType: p.deviceType, backedUp: p.backedUp, transports: p.transports })),
  });
}
