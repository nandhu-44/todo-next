# ToDo Next

A rebuild of the original MERN todo app on **Next.js (App Router) + TypeScript**, keeping the original
fonts (Lilita One + Poppins) with a new warm, flat design.

## What's new vs. the MERN version
- Next.js route handlers replace the Express server — one deployable app
- Priorities, due dates (overdue / today badges), tags, search, filters and sorting
- Drag-and-drop reordering, undo for delete & clear-completed, progress ring stats
- Light / dark theme, keyboard shortcuts (`N` new todo, `/` search), toast notifications
- shadcn/ui-style components on Radix primitives (dialogs, select, tooltip, menu, date picker), Sonner toasts, Framer Motion animations and Lucide icons
- Secure auth: bcrypt hashes, signed httpOnly JWT cookie, hashed single-use reset tokens

## Run it
```bash
npm install
cp .env.example .env.local   # set AUTH_SECRET at minimum for production
npm run dev
```
With no `MONGO_URI`, data lives in `./data/db.json` (zero setup). Set `MONGO_URI` to use MongoDB.
With no SMTP settings, password-reset links are printed to the server console (and shown on the page in dev).

Existing users from the MERN app are not migrated (passwords were stored with a different scheme) — sign up again.

## Security & accounts
- **Google sign-in** (OAuth 2.0 code flow with PKCE + state; ID token verified against Google's keys). Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
  and add `<your-site-url>/api/auth/google/callback` as an authorised redirect URI. The button only appears when configured.
- **Two-step verification (TOTP)** with QR setup, replay protection and 8 one-time recovery codes. Secrets are AES-256-GCM encrypted at rest.
- **Account settings** (`/settings`): name, change/set password, 2FA, connected Google account, delete account.
- Login, 2FA and sensitive account actions are rate-limited (in-memory; use a shared store such as Redis if you run multiple instances).

## Accounts
- **Email is the account key.** Addresses are normalised (lower-cased; for Gmail, dots and `+tags` are ignored), and uniqueness is enforced in the
  database (including under concurrent sign-ups), so one inbox can never become two accounts.
- Google and email + password sign-in reach the **same account**. Sign in with Google, then add a password under *Settings → Password*
  (or use "Forgot password"), and you can use either. *Settings → Sign-in methods* shows what is connected; Google can be disconnected once a password exists.
- List preferences (sort order, status filter, tag filter) are remembered per user in the browser.

## Local-only mode
*Settings → Local-only mode* keeps your todos in this browser; nothing is uploaded until you press **Sync**. Turning it off syncs first.
Because each device then holds its own copy, the server does a three-way merge on sync (`src/lib/sync.ts`) using the snapshot from the last sync:
edits to different todos combine, the newest edit wins when the same todo changed on both sides, a delete never discards a newer edit, and a manual
reorder on the syncing device is kept. Run `npm test` for the merge scenarios. (Conflict resolution compares device timestamps, so badly wrong device clocks can pick the wrong "newest".)

## Appearance
*Settings → Appearance* lets each account choose a font (Lilita One + Poppins, Fraunces + Public Sans, IBM Plex Sans, Literata, Atkinson Hyperlegible Next,
JetBrains Mono), one of six colour themes (Terracotta, Moss, Harbor, Saffron, Rosewood, Graphite) or a custom theme, and the corner roundness.
Changes preview live across the whole app and are saved to the account (and mirrored in a cookie so the first server-rendered paint is already themed on any device you sign in on).
Light and dark palettes are generated from a theme's accent colour, background hue and tint strength (`src/lib/appearance.ts`); accent text is auto-adjusted to meet WCAG AA contrast,
which `npm test` verifies for every preset in both modes.

## Public API
Create keys in *Settings → API access* (`sk_tdn.` plus 64 random characters = 384 bits, shown once, stored only as a SHA-256 hash, optional expiry, read/write permissions, optional lower daily limit) and call `/api/v1`
with `Authorization: Bearer sk_tdn.…`. Endpoints: `GET/POST /api/v1/todos`, `GET/PATCH/DELETE /api/v1/todos/:id`, `POST /api/v1/todos/clear-completed`, `GET /api/v1/me`, `GET /api/v1/usage`.
Docs live at `/docs` and the OpenAPI 3.1 spec at `/api/v1/openapi.json`.

Quotas (all configurable, see `.env.example`): 60 requests/minute and 2,000 requests/day per key, 5 keys and 5,000 todos per account. Every response carries `X-RateLimit-*`
(per minute) and `X-Quota-*` (per day) headers; going over returns `429` with `Retry-After`. The daily quota is counted in the database and is exact; the per-minute limit is held in
memory per server instance, so on serverless hosting it is a best-effort burst limit. `tests/api.integration.js` exercises all of it (the header of that file shows how to run it).

## Performance and diagnostics
- The home page loads the account and its todos in parallel on the server, so the page arrives with its data (no second request).
- Database connection: short timeouts (6 s instead of the driver's 30 s default), a small pool, indexes created in the background, and a failed connection is never cached.
- Slow queries (over 300 ms) and each new instance's connection time are logged (`[db] …`) so they show up in the host's logs.
- `GET /api/health` is a cheap public check. Set `HEALTH_TOKEN` and call `GET /api/health?deep=1` with `Authorization: Bearer <token>` to see connect time and round-trip latency to the database from the deployed function.
- Biggest wins on Vercel: put the function region in the **same region as the database** (Project Settings → Functions), and use the standard `mongodb://` connection string rather than `mongodb+srv://` to skip the SRV DNS lookup on cold starts.

## Passkeys
*Settings → Passkeys* registers a passkey (WebAuthn) so you can sign in with a fingerprint, face or screen lock and no password, from the sign-in page via **Sign in with a passkey**
(no email needed). The device keeps the private key; only the public key is stored. Sign-in requires user verification (PIN/biometric), so it counts as two factors and skips the TOTP code.
Passkeys are bound to the site's domain: set `WEBAUTHN_RP_ID` / `WEBAUTHN_ORIGIN` in production, and note that preview deployments (a different domain) can't use passkeys made elsewhere.
You can't remove your last way to sign in. Implemented with `@simplewebauthn`; challenges live in a short-lived signed cookie and are single-use.

## Bot protection
Sign-up and password reset always require a security check, and sign-in requires one after 3 wrong passwords for that account from that address. Set `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`
to use Cloudflare Turnstile. Otherwise a built-in proof-of-work check runs in the background (about 0.1 s in a desktop browser): each solution is signed by the server, expires in 5 minutes
and works once. It raises the cost of mass sign-ups but is not a real bot detector, since a script solves it in milliseconds; use Turnstile for production. `CAPTCHA_PROVIDER=off` disables it.
