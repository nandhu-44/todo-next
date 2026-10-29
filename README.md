# ToDo App (Next.js)

A rebuild of the original MERN todo app on **Next.js (App Router) + TypeScript**, keeping the original look
(Lilita One + Poppins, blue / green / amber / red cards) on a new animated aurora background.

## What's new vs. the MERN version
- Next.js route handlers replace the Express server — one deployable app
- Priorities, due dates (overdue / today badges), tags, search, filters and sorting
- Drag-and-drop reordering, undo for delete & clear-completed, progress ring stats
- Light / dark theme, keyboard shortcuts (`N` new todo, `/` search), toast notifications
- Framer Motion animations and Lucide icons throughout
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
