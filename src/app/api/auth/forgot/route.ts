import { createHash, randomBytes, randomUUID } from "crypto";
import { json } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { sendResetMail } from "@/lib/mail";
import { requestOrigin } from "@/lib/origin";

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const email = String(b?.email ?? "").trim().toLowerCase();
  const db = await getDb();
  const user = email ? await db.users.findOne({ email }) : null;
  let devLink: string | undefined;

  if (user) {
    await db.resets.remove({ userId: user.id });
    const token = randomBytes(32).toString("hex");
    await db.resets.insert({
      id: randomUUID(),
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: Date.now() + 60 * 60 * 1000,
    });
    const base = requestOrigin(req);
    const link = `${base}/reset-password?token=${token}`;
    const mailed = await sendResetMail(user.email, link).catch((e) => {
      console.error("Failed to send reset mail", e);
      return false;
    });
    if (!mailed && process.env.NODE_ENV !== "production") devLink = link;
  }
  // Same response whether or not the account exists, to avoid leaking who is registered.
  return json({ ok: true, devLink });
}
