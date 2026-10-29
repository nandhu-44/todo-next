import bcrypt from "bcryptjs";
import { createSession, fail, json, toPublic } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const email = String(b?.email ?? "").trim().toLowerCase();
  const password = String(b?.password ?? "");
  const user = email ? await (await getDb()).users.findOne({ email }) : null;

  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return fail("Incorrect email or password", 401);

  await createSession(user.id, b?.remember !== false);
  return json({ user: toPublic(user) });
}
