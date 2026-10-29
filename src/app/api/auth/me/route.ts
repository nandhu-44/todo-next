import { getUser, json, toPublic } from "@/lib/auth";

export async function GET() {
  const user = await getUser();
  return json({ user: user ? toPublic(user) : null });
}
