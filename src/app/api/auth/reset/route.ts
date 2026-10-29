import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { fail, json } from "@/lib/auth";
import { getDb } from "@/lib/db";

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

async function findValid(token: string) {
  if (!token) return null;
  const r = await (await getDb()).resets.findOne({ tokenHash: hash(token) });
  return r && r.expiresAt > Date.now() ? r : null;
}

// Check a token is still valid before showing the form.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  return json({ valid: !!(await findValid(token)) });
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const password = String(b?.password ?? "");
  if (password.length < 8) return fail("Password must be at least 8 characters");
  const reset = await findValid(String(b?.token ?? ""));
  if (!reset) return fail("This reset link is invalid or has expired", 410);

  const db = await getDb();
  await db.users.update(reset.userId, { passwordHash: await bcrypt.hash(password, 10) });
  await db.resets.remove({ userId: reset.userId });
  return json({ ok: true });
}
