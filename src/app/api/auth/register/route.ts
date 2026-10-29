import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { createSession, fail, json, toPublic } from "@/lib/auth";
import { getDb, type UserDoc } from "@/lib/db";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? "").trim();
  const email = String(b?.email ?? "").trim().toLowerCase();
  const password = String(b?.password ?? "");

  if (!name || name.length > 60) return fail("Please enter your name");
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Please enter a valid email");
  if (password.length < 8) return fail("Password must be at least 8 characters");

  const db = await getDb();
  if (await db.users.findOne({ email })) return fail("An account with this email already exists", 409);

  const user: UserDoc = {
    id: randomUUID(),
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString(),
  };
  await db.users.insert(user);
  await createSession(user.id, true);
  return json({ user: toPublic(user) }, 201);
}
