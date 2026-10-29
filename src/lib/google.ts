import { requestOrigin } from "./origin";

export const oauthCookie = "todo_oauth";

export const signingKey = () =>
  new TextEncoder().encode(process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me");

export const googleEnabled = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export function googleConfig(req: Request) {
  if (!googleEnabled()) return null;
  const base = requestOrigin(req);
  return {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: `${base}/api/auth/google/callback`,
    base,
  };
}
