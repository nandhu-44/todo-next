# ToDo App (Next.js)

A rebuild of the original MERN todo app on **Next.js (App Router) + TypeScript**, keeping the original look
(Lilita One + Poppins, blue / green / amber / red cards) on a new animated aurora background.

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
  and add `<APP_URL>/api/auth/google/callback` as an authorised redirect URI. The button only appears when configured.
- **Two-step verification (TOTP)** with QR setup, replay protection and 8 one-time recovery codes. Secrets are AES-256-GCM encrypted at rest.
- **Account settings** (`/settings`): name, change/set password, 2FA, connected Google account, delete account.
- Login, 2FA and sensitive account actions are rate-limited (in-memory; use a shared store such as Redis if you run multiple instances).
