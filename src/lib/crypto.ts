import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const key = () => createHash("sha256").update(`todo-next:v1:${process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me"}`).digest();

export const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/** AES-256-GCM; output is iv.tag.ciphertext (base64url). */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(payload: string): string {
  const [iv, tag, data] = payload.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString("utf8");
}
