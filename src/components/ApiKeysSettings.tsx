"use client";
import { Braces, Check, Copy, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/localStore";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { Section } from "./SettingsSection";
import { Button } from "./ui/button";
import { FormCheckbox } from "./ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, Dialog, DialogContent } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface KeyInfo {
  id: string; name: string; prefix: string; scopes: string[]; createdAt: string; lastUsedAt: string | null; expiresAt: string | null; dailyLimit: number | null;
  usage: { today: number; limit: number; days: { day: string; count: number }[] };
}
interface Data { keys: KeyInfo[]; limits: { keys: number; perMinute: number; perDay: number } }

const EXPIRY = [{ v: "never", l: "Never" }, { v: "7", l: "7 days" }, { v: "30", l: "30 days" }, { v: "90", l: "90 days" }, { v: "365", l: "1 year" }];

export default function ApiKeysSettings() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<KeyInfo | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await api<Data>("/api/account/keys"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function revoke(k: KeyInfo) {
    setDeleting(null);
    try {
      await api(`/api/account/keys/${k.id}`, { method: "DELETE" });
      setData((d) => d && { ...d, keys: d.keys.filter((x) => x.id !== k.id) });
      notify.success(`Key “${k.name}” deleted`);
    } catch (e) {
      notify.error((e as Error).message);
    }
  }

  const full = data ? data.keys.length >= data.limits.keys : false;

  return (
    <Section icon={Braces} title="API access" description="Use keys to read and write your todos from scripts and other apps. Each key has its own permissions and daily quota.">
      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>Couldn&apos;t load your keys: {error}</span>
          <Button size="icon-sm" variant="outline" className="w-auto px-3 text-sm" onClick={load}>Retry</Button>
        </div>
      ) : !data ? (
        <div aria-busy="true" aria-label="Loading API keys" className="animate-soft-pulse space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border p-4">
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-3 w-56 max-w-full rounded-full bg-muted/70" />
              <div className="h-2 w-full rounded-full bg-muted/70" />
            </div>
          ))}
          <div className="h-10 w-36 rounded-xl bg-muted" />
        </div>
      ) : (
        <div className="space-y-3">
          {data.keys.length === 0 && <p className="rounded-xl bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">No API keys yet.</p>}
          {data.keys.map((k) => <KeyRow key={k.id} k={k} onDelete={() => setDeleting(k)} />)}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setCreateOpen(true)} disabled={full}><Plus /> Create API key</Button>
            <Button asChild variant="ghost"><Link href="/docs">API documentation</Link></Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Each key: up to {data.limits.perMinute} requests per minute and {data.limits.perDay.toLocaleString()} per day (UTC). {data.keys.length} of {data.limits.keys} keys used.
            {full && " Delete a key to create another."}
          </p>
        </div>
      )}

      {data && <CreateDialog open={createOpen} maxDaily={data.limits.perDay} onClose={() => setCreateOpen(false)} onCreated={(s) => { setCreateOpen(false); setSecret(s); load(); }} />}
      <SecretDialog secret={secret} onClose={() => setSecret(null)} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent
          title="Delete this key?"
          footer={
            <>
              <AlertDialogCancel asChild><Button variant="secondary">Keep it</Button></AlertDialogCancel>
              <AlertDialogAction asChild><Button variant="destructive" onClick={() => deleting && revoke(deleting)}>Delete key</Button></AlertDialogAction>
            </>
          }
        >
          <p className="heading text-lg">&ldquo;{deleting?.name}&rdquo; stops working immediately.</p>
          <p className="mt-1 text-sm text-muted-foreground">Anything still using it will start getting 401 errors. This can&apos;t be undone.</p>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}

function KeyRow({ k, onDelete }: { k: KeyInfo; onDelete: () => void }) {
  const pct = Math.min(100, (k.usage.today / Math.max(1, k.usage.limit)) * 100);
  const max = Math.max(1, ...k.usage.days.map((d) => d.count));
  const expired = k.expiresAt && Date.parse(k.expiresAt) < Date.now();
  return (
    <div className={cn("rounded-xl border border-border p-4", expired && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="heading truncate text-base">{k.name} {expired && <span className="ml-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[11px] text-destructive">expired</span>}</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{k.prefix}…</p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={`Delete key ${k.name}`} onClick={onDelete} className="hover:bg-destructive/12 hover:text-destructive"><Trash2 className="!size-4" /></Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {k.scopes.map((s) => <span key={s} className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] text-primary">{s === "todos:read" ? "read" : "write"}</span>)}
        <span className="text-[11px] text-muted-foreground">
          Created {new Date(k.createdAt).toLocaleDateString()} · {k.lastUsedAt ? `last used ${timeAgo(k.lastUsedAt)}` : "never used"} · {k.expiresAt ? `${expired ? "expired" : "expires"} ${new Date(k.expiresAt).toLocaleDateString()}` : "no expiry"}
        </span>
      </div>
      <div className="mt-3 flex items-end gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted-foreground">Today</span>
            <span className="tabular-nums">{k.usage.today.toLocaleString()} / {k.usage.limit.toLocaleString()}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={k.usage.today} aria-valuemax={k.usage.limit} aria-label={`${k.name} requests today`}>
            <div className={cn("h-full rounded-full transition-all", pct >= 90 ? "bg-destructive" : "bg-primary")} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex h-8 items-end gap-0.5" aria-label="Requests over the last 7 days">
          {k.usage.days.map((d) => (
            <div key={d.day} title={`${d.day}: ${d.count}`} className="w-2 rounded-sm bg-primary/40" style={{ height: `${Math.max(8, (d.count / max) * 100)}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CreateDialog({ open, maxDaily, onClose, onCreated }: { open: boolean; maxDaily: number; onClose: () => void; onCreated: (secret: string) => void }) {
  const [name, setName] = useState("");
  const [read, setRead] = useState(true);
  const [write, setWrite] = useState(true);
  const [expiry, setExpiry] = useState("never");
  const [daily, setDaily] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setName(""); setRead(true); setWrite(true); setExpiry("never"); setDaily(""); setError(""); }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const scopes = [read && "todos:read", write && "todos:write"].filter(Boolean);
    setBusy(true);
    setError("");
    try {
      const r = await api<{ secret: string }>("/api/account/keys", {
        method: "POST",
        body: { name, scopes, expiresInDays: expiry === "never" ? null : Number(expiry), dailyLimit: daily ? Number(daily) : null },
      });
      onCreated(r.secret);
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Create API key" description="Name, permissions and limits for a new API key">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="key-name">Name</Label>
            <Input id="key-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Home automation script" maxLength={40} required autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Permissions</Label>
            <FormCheckbox id="k-read" name="read" checked={read} onCheckedChange={setRead}><span>Read todos <span className="text-muted-foreground">(list and view)</span></span></FormCheckbox>
            <FormCheckbox id="k-write" name="write" checked={write} onCheckedChange={setWrite}><span>Write todos <span className="text-muted-foreground">(create, change, delete)</span></span></FormCheckbox>
            {!read && !write && <p className="text-xs text-destructive">Choose at least one permission.</p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Expires</Label>
              <Select value={expiry} onValueChange={setExpiry}>
                <SelectTrigger className="w-full" aria-label="Expiry"><SelectValue /></SelectTrigger>
                <SelectContent>{EXPIRY.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="key-daily">Daily limit</Label>
              <Input id="key-daily" type="number" min={1} max={maxDaily} value={daily} onChange={(e) => setDaily(e.target.value)} placeholder={`${maxDaily.toLocaleString()} (default)`} />
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy || !name.trim() || (!read && !write)}>{busy && <Loader2 className="animate-spin" />} Create key</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SecretDialog({ secret, onClose }: { secret: string | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => setCopied(false), [secret]);
  return (
    <Dialog open={!!secret} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title="Your new API key"
        description="Copy this key now; it is only shown once"
        footer={<Button onClick={onClose}>Done</Button>}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="space-y-3">
          <p className="rounded-xl bg-prio-medium/15 p-3 text-sm">Copy it now. For your security it <strong>won&apos;t be shown again</strong>. If you lose it, delete the key and create a new one.</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-xl border border-border bg-muted/50 p-3 font-mono text-xs" data-testid="new-secret">{secret}</code>
            <Button variant="secondary" size="icon" aria-label="Copy key" onClick={() => secret && navigator.clipboard.writeText(secret).then(() => { setCopied(true); notify.success("Key copied"); })}>
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-border bg-muted/50 p-3 font-mono text-[11px] leading-relaxed">{`curl ${typeof window !== "undefined" ? window.location.origin : ""}/api/v1/todos \\\n  -H "Authorization: Bearer ${secret ?? ""}"`}</pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
