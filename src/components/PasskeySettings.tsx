"use client";
import { startRegistration } from "@simplewebauthn/browser";
import { Cloud, Fingerprint, Loader2, Pencil, Plus, Smartphone, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/localStore";
import { notify } from "@/lib/notify";
import { supportsPasskeys, passkeyError } from "@/lib/passkeyClient";
import { Section } from "./SettingsSection";
import { Button } from "./ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, Dialog, DialogContent } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface Passkey { id: string; name: string; createdAt: string; lastUsedAt: string | null; deviceType: "singleDevice" | "multiDevice"; backedUp: boolean }

export default function PasskeySettings({ onCount }: { onCount: (n: number) => void }) {
  const [list, setList] = useState<Passkey[] | null>(null);
  const [error, setError] = useState("");
  const [supported, setSupported] = useState<boolean | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<Passkey | null>(null);
  const [renaming, setRenaming] = useState<Passkey | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await api<{ passkeys: Passkey[] }>("/api/account/passkeys");
      setList(r.passkeys);
      onCount(r.passkeys.length);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [onCount]);
  useEffect(() => { load(); setSupported(supportsPasskeys()); }, [load]);

  async function remove(p: Passkey) {
    setRemoving(null);
    try {
      await api(`/api/account/passkeys/${encodeURIComponent(p.id)}`, { method: "DELETE" });
      notify.success(`Passkey “${p.name}” removed`);
      load();
    } catch (e) {
      notify.error((e as Error).message);
    }
  }

  return (
    <Section icon={Fingerprint} title="Passkeys" description="Sign in with your fingerprint, face or screen lock instead of a password. Your device keeps the private key; we only store the public half.">
      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>Couldn&apos;t load your passkeys: {error}</span>
          <Button size="icon-sm" variant="outline" className="w-auto px-3 text-sm" onClick={load}>Retry</Button>
        </div>
      ) : !list ? (
        <div aria-busy="true" aria-label="Loading passkeys" className="animate-soft-pulse space-y-3">
          <div className="space-y-2 rounded-xl border border-border p-4"><div className="h-4 w-40 rounded bg-muted" /><div className="h-3 w-56 max-w-full rounded-full bg-muted/70" /></div>
          <div className="h-10 w-40 rounded-xl bg-muted" />
        </div>
      ) : (
        <div className="space-y-3">
          {list.length === 0 && <p className="rounded-xl bg-muted/50 px-4 py-5 text-center text-sm text-muted-foreground">No passkeys yet. Add one to sign in without typing a password.</p>}
          {list.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">{p.deviceType === "multiDevice" ? <Cloud className="size-4" /> : <Smartphone className="size-4" />}</span>
              <div className="min-w-0 flex-1">
                <p className="heading truncate text-base">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.deviceType === "multiDevice" ? "Synced across your devices" : "This device only"} · added {new Date(p.createdAt).toLocaleDateString()} · {p.lastUsedAt ? `used ${timeAgo(p.lastUsedAt)}` : "never used"}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label={`Rename passkey ${p.name}`} onClick={() => setRenaming(p)}><Pencil className="!size-4" /></Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Remove passkey ${p.name}`} onClick={() => setRemoving(p)} className="hover:bg-destructive/12 hover:text-destructive"><Trash2 className="!size-4" /></Button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setAddOpen(true)} disabled={supported === false}><Plus /> Add a passkey</Button>
            {supported === false && <span className="text-xs text-muted-foreground">This browser doesn&apos;t support passkeys.</span>}
          </div>
          {list.length > 0 && <p className="text-xs text-muted-foreground">A passkey with a PIN or biometric already counts as two factors, so signing in with one skips the 6-digit code.</p>}
        </div>
      )}

      <AddDialog open={addOpen} defaultName={`Passkey ${(list?.length ?? 0) + 1}`} onClose={() => setAddOpen(false)} onAdded={() => { setAddOpen(false); notify.success("Passkey added"); load(); }} />
      <RenameDialog passkey={renaming} onClose={() => setRenaming(null)} onDone={() => { setRenaming(null); load(); }} />

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent
          title="Remove this passkey?"
          footer={
            <>
              <AlertDialogCancel asChild><Button variant="secondary">Keep it</Button></AlertDialogCancel>
              <AlertDialogAction asChild><Button variant="destructive" onClick={() => removing && remove(removing)}>Remove</Button></AlertDialogAction>
            </>
          }
        >
          <p className="heading text-lg">&ldquo;{removing?.name}&rdquo; will stop working here.</p>
          <p className="mt-1 text-sm text-muted-foreground">You can delete the passkey from your device or password manager too; it&apos;s no longer accepted either way.</p>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}

function AddDialog({ open, defaultName, onClose, onAdded }: { open: boolean; defaultName: string; onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (open) { setName(defaultName); setError(""); } }, [open, defaultName]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const optionsJSON = await api<Parameters<typeof startRegistration>[0]["optionsJSON"]>("/api/account/passkeys/options", { method: "POST" });
      const response = await startRegistration({ optionsJSON }); // the browser/OS asks for your fingerprint, face or PIN here
      await api("/api/account/passkeys/verify", { method: "POST", body: { response, name } });
      onAdded();
    } catch (err) {
      setError(passkeyError(err));
    }
    setBusy(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent title="Add a passkey" description="Create a passkey on this device">
        <form onSubmit={add} className="space-y-4">
          <p className="text-sm text-muted-foreground">Your device will ask you to confirm with your fingerprint, face, PIN or security key.</p>
          <div className="space-y-1.5">
            <Label htmlFor="pk-name">Name</Label>
            <Input id="pk-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Pixel 8, MacBook…" />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Fingerprint />} Create passkey</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RenameDialog({ passkey, onClose, onDone }: { passkey: Passkey | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setName(passkey?.name ?? ""), [passkey]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!passkey) return;
    setBusy(true);
    try {
      await api(`/api/account/passkeys/${encodeURIComponent(passkey.id)}`, { method: "PATCH", body: { name } });
      onDone();
    } catch (err) {
      notify.error((err as Error).message);
    }
    setBusy(false);
  }
  return (
    <Dialog open={!!passkey} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Rename passkey" description="Change the passkey's name">
        <form onSubmit={save} className="space-y-4">
          <Input aria-label="Passkey name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy || !name.trim()}>{busy && <Loader2 className="animate-spin" />} Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
