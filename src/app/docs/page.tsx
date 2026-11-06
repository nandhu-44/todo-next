import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { ENDPOINTS } from "@/lib/openapi";
import { limits } from "@/lib/limits";

export const metadata: Metadata = { title: "API docs · ToDo Next" };

const METHOD_STYLE: Record<string, string> = { get: "bg-p-low/20 text-foreground", post: "bg-primary/15 text-primary", patch: "bg-p-medium/20 text-foreground", delete: "bg-destructive/15 text-destructive" };

function Code({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-xl border border-border bg-muted/50 p-3 font-mono text-xs leading-relaxed">{children}</pre>;
}

export default function Docs() {
  const l = limits();
  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-5 sm:px-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2"><Logo className="size-8" /><span className="heading text-xl text-primary">ToDo Next</span></Link>
        <ThemeToggle />
      </header>
      <h1 className="heading mt-8 text-3xl">API</h1>
      <p className="mt-2 text-muted-foreground">Read and write your todos from scripts, shortcuts and other apps. The machine-readable spec is at <a className="text-primary underline" href="/api/v1/openapi.json">/api/v1/openapi.json</a>.</p>

      <section className="mt-8 space-y-3">
        <h2 className="heading text-xl">Authentication</h2>
        <p className="text-sm text-muted-foreground">Create a key under <Link href="/settings" className="text-primary underline">Settings → API access</Link> and send it with every request. Keys are shown once and can be limited to read-only.</p>
        <Code>{`curl https://YOUR-SITE/api/v1/todos \\\n  -H "Authorization: Bearer tdn_your_key_here"`}</Code>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="heading text-xl">Limits</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li><strong className="text-foreground">{l.perMinute} requests per minute</strong> per key.</li>
          <li><strong className="text-foreground">{l.perDay.toLocaleString()} requests per day</strong> per key (resets at 00:00 UTC). A key can be given a lower daily limit.</li>
          <li>At most <strong className="text-foreground">{l.keysPerUser} keys</strong> and <strong className="text-foreground">{l.todosPerUser.toLocaleString()} todos</strong> per account.</li>
        </ul>
        <p className="text-sm text-muted-foreground">Every response carries <code className="font-mono text-xs">X-RateLimit-Limit / -Remaining / -Reset</code> (per minute) and <code className="font-mono text-xs">X-Quota-Limit / -Remaining / -Reset</code> (per day). When a limit is hit you get <code className="font-mono text-xs">429</code> with a <code className="font-mono text-xs">Retry-After</code> header in seconds.</p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="heading text-xl">Errors</h2>
        <p className="text-sm text-muted-foreground">Errors are JSON with a stable <code className="font-mono text-xs">code</code>:</p>
        <Code>{`HTTP 429\n{ "error": { "code": "quota_exceeded", "message": "Daily quota of 2000 requests exceeded. It resets at 00:00 UTC." } }`}</Code>
        <p className="text-sm text-muted-foreground">Codes: <code className="font-mono text-xs">unauthorized</code> <code className="font-mono text-xs">invalid_key</code> <code className="font-mono text-xs">key_expired</code> <code className="font-mono text-xs">insufficient_scope</code> <code className="font-mono text-xs">rate_limited</code> <code className="font-mono text-xs">quota_exceeded</code> <code className="font-mono text-xs">invalid_body</code> <code className="font-mono text-xs">invalid_parameter</code> <code className="font-mono text-xs">not_found</code> <code className="font-mono text-xs">todo_limit_reached</code></p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="heading text-xl">Endpoints</h2>
        {ENDPOINTS.map((e) => (
          <div key={e.method + e.path} className="surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-md px-2 py-0.5 font-mono text-xs font-semibold uppercase ${METHOD_STYLE[e.method]}`}>{e.method}</span>
              <code className="font-mono text-sm">{e.path}</code>
            </div>
            <p className="mt-2 text-sm">{e.summary}</p>
            <p className="text-xs text-muted-foreground">Scope: {e.scope}</p>
            {e.params && e.params.length > 0 && (
              <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[auto_1fr]">
                {e.params.map((p) => (<div key={p.name} className="contents"><dt className="font-mono text-foreground">{p.name}</dt><dd className="text-muted-foreground">{p.description}</dd></div>))}
              </dl>
            )}
            {e.body && <div className="mt-2"><Code>{e.body}</Code></div>}
          </div>
        ))}
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="heading text-xl">Examples</h2>
        <Code>{`# add a todo
curl -X POST https://YOUR-SITE/api/v1/todos \\
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \\
  -d '{"title":"Book dentist appointment","priority":"medium","dueDate":"2026-12-01"}'

# everything overdue, most urgent first
curl "https://YOUR-SITE/api/v1/todos?overdue=true&sort=priority" -H "Authorization: Bearer $KEY"

# mark one done
curl -X PATCH https://YOUR-SITE/api/v1/todos/TODO_ID \\
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"completed":true}'`}</Code>
      </section>
    </main>
  );
}
