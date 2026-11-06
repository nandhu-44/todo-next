import { captchaConfig } from "@/lib/captcha";
import { createPow } from "@/lib/pow";
import { fail, json } from "@/lib/auth";
import { allow, clientIp } from "@/lib/rateLimit";

/** Issues a proof-of-work challenge for the built-in CAPTCHA. */
export async function GET(req: Request) {
  const cfg = captchaConfig();
  if (cfg.provider !== "pow") return json({ provider: cfg.provider });
  if (!allow(`captcha:${clientIp(req)}`, 60, 60_000)) return fail("Too many requests", 429);
  return json({ provider: "pow", ...createPow() }, 200);
}
