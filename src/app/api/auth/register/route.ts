import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { createSession, fail, json, toPublic } from "@/lib/auth";
import { DuplicateError, getDb, type UserDoc } from "@/lib/db";
import { isEmail, normalizeEmail } from "@/lib/email";

const existsMessage = (hasPassword: boolean) =>
  hasPassword
    ? "An account with this email already exists. Try signing in instead."
    : "This email is already registered with Google. Continue with Google, then add a password in Settings, or use \u201cForgot password\u201d to set one.";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? "").trim();
  const email = normalizeEmail(String(b?.email ?? ""));
  const password = String(b?.password ?? "");

  if (!name || name.length > 60) return fail("Please enter your name");
  if (!isEmail(email)) return fail("Please enter a valid email");
  if (password.length < 8) return fail("Password must be at least 8 characters");

  const db = await getDb();
  const existing = await db.users.findOne({ email });
  if (existing) return fail(existsMessage(!!existing.passwordHash), 409);

  const user: UserDoc = {
    id: randomUUID(),
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString(),
  };
  try {
    await db.users.insert(user);
  } catch (e) {
    // lost a race with another sign-up for the same email
    if (e instanceof DuplicateError) return fail(existsMessage(true), 409);
    throw e;
  }
  await createSession(user.id, true);
  return json({ user: toPublic(user) }, 201);
}
