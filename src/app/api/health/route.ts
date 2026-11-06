import { getDb, dbInfo } from "@/lib/db";

const startedAt = Date.now();
let served = 0;

/**
 * GET /api/health         -> { ok, coldStart, region, uptimeSec }   (public, never touches the database)
 * GET /api/health?deep=1  -> adds database connect time and round-trip latency.
 *                            Needs `Authorization: Bearer $HEALTH_TOKEN`; disabled while HEALTH_TOKEN is unset.
 *
 * Use it to tell a cold start from a slow database, and to compare the function's region with the database's.
 */
export async function GET(req: Request) {
  const first = served++ === 0;
  const base = {
    ok: true,
    coldStart: first, // true for the first request this instance serves
    region: process.env.VERCEL_REGION ?? "local",
    uptimeSec: Math.round((Date.now() - startedAt) / 1000),
  };
  if (new URL(req.url).searchParams.get("deep") !== "1") return Response.json(base);

  const token = process.env.HEALTH_TOKEN;
  if (!token || req.headers.get("authorization") !== `Bearer ${token}`) return Response.json({ error: "Not found" }, { status: 404 });

  const t0 = performance.now();
  try {
    const db = await getDb(); // connects if this instance is new
    const connectedMs = Math.round(performance.now() - t0);
    const samples: number[] = [];
    for (let i = 0; i < 3; i++) {
      const t = performance.now();
      await db.users.count({ id: "__health__" }); // a real round trip to the database
      samples.push(Math.round(performance.now() - t));
    }
    return Response.json(
      { ...base, db: { kind: dbInfo()?.kind, getDbMs: connectedMs, connectMs: dbInfo()?.connectMs ?? null, roundTripMs: samples, mongoRegionHint: "compare roundTripMs with region above" } },
      { headers: { "Server-Timing": `db;dur=${Math.min(...samples)}` } },
    );
  } catch (e) {
    return Response.json({ ...base, ok: false, db: { error: (e as Error).message, afterMs: Math.round(performance.now() - t0) } }, { status: 503 });
  }
}
