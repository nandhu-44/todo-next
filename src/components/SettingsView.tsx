"use client";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Copy, Download, KeyRound, Loader2, Lock, ShieldCheck, ShieldOff, Trash2, User } from "lucide-react";
import Logo from "./Logo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";
import type { PublicUser } from "@/lib/types";
import { GoogleButton } from "./AuthShell";
import { OtpInput } from "./OtpInput";
import ThemeToggle from "./ThemeToggle";
import { Button } from "./ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, Dialog, DialogContent } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

function Section({ icon: Icon, title, description, children, danger }: { icon: typeof User; title: string; description?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={`surface p-5 ${danger ? "border-destructive/40" : ""}`}>
      <div className="mb-4 flex items-start gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${danger ? "bg-destructive/12 text-destructive" : "bg-primary/15 text-primary"}`}>
          <Icon className="size-5" />
        </span>
        <div>
          <h2 className="heading text-lg">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

export default function SettingsView({ initial, googleEnabled }: { initial: PublicUser; googleEnabled: boolean }) {
  const router = useRouter();
  const [user, setUser] = useState(initial);

  return (
    <main className="mx-auto max-w-2xl px-3 pb-24 pt-5 sm:px-6">
      <header className="flex items-center justify-between">
        <Button asChild variant="ghost">
          <Link href="/"><ArrowLeft /> Back to todos</Link>
        </Button>
        <ThemeToggle />
      </header>
      <div className="mt-4 flex items-center gap-3">
        <Logo className="size-9" />
        <div>
          <h1 className="heading text-2xl">Account settings</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <ProfileSection user={user} onChange={setUser} />
        <PasswordSection user={user} onChange={setUser} />
        <TwoFactorSection user={user} onChange={setUser} />
        <Section icon={KeyRound} title="Connected accounts" description="Sign in with one click using Google.">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">
              Google: <span className="font-medium">{user.google ? "Connected" : "Not connected"}</span>
            </p>
            {!user.google && googleEnabled && <div className="w-56"><GoogleButton label="Connect Google" /></div>}
            {!user.google && !googleEnabled && <p className="text-xs text-muted-foreground">Not configured on this server</p>}
          </div>
          {!user.google && googleEnabled && (
            <p className="mt-2 text-xs text-muted-foreground">Use the Google account that has the same email as this one to link them.</p>
          )}
        </Section>
        <DeleteSection user={user} onDeleted={() => { router.replace("/signup"); router.refresh(); }} />
      </div>
    </main>
  );
}

/* ------------------------------- profile ------------------------------- */
function ProfileSection({ user, onChange }: { user: PublicUser; onChange: (u: PublicUser) => void }) {
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const dirty = name.trim() !== user.name;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await api<{ user: PublicUser }>("/api/account", { method: "PATCH", body: { name } });
      onChange(r.user);
      setName(r.user.name);
      notify.success("Name updated");
    } catch (err) {
      notify.error((err as Error).message);
    }
    setSaving(false);
  }

  return (
    <Section icon={User} title="Profile">
      <form onSubmit={save} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="s-name">Name</Label>
          <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="John Doe" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-email">Email</Label>
          <Input id="s-email" value={user.email} disabled />
        </div>
        <Button type="submit" disabled={!dirty || saving}>{saving && <Loader2 className="animate-spin" />} Save</Button>
      </form>
    </Section>
  );
}

/* ------------------------------- password ------------------------------- */
function PasswordSection({ user, onChange }: { user: PublicUser; onChange: (u: PublicUser) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    if (f.get("next") !== f.get("confirm")) return setError("Passwords don't match");
    setSaving(true);
    setError("");
    try {
      const r = await api<{ user: PublicUser }>("/api/account/password", { method: "POST", body: { current: f.get("current"), next: f.get("next") } });
      onChange(r.user);
      form.reset();
      notify.success(user.hasPassword ? "Password changed" : "Password set");
    } catch (err) {
      setError((err as Error).message);
    }
    setSaving(false);
  }

  return (
    <Section icon={Lock} title={user.hasPassword ? "Password" : "Set a password"} description={user.hasPassword ? "Use at least 8 characters." : "You signed up with Google. Add a password to also sign in with your email."}>
      <form onSubmit={save} className="space-y-3">
        {user.hasPassword && (
          <div className="space-y-1.5">
            <Label htmlFor="p-current">Current password</Label>
            <Input id="p-current" name="current" type="password" autoComplete="current-password" required />
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="p-next">New password</Label>
            <Input id="p-next" name="next" type="password" autoComplete="new-password" minLength={8} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-confirm">Confirm</Label>
            <Input id="p-confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />} {user.hasPassword ? "Change password" : "Set password"}</Button>
      </form>
    </Section>
  );
}

/* ----------------------------- two-factor auth ----------------------------- */
function TwoFactorSection({ user, onChange }: { user: PublicUser; onChange: (u: PublicUser) => void }) {
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [disableOpen, setDisableOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      setSetup(await api<{ qr: string; secret: string }>("/api/account/2fa/setup", { method: "POST" }));
    } catch (err) {
      notify.error((err as Error).message);
    }
    setBusy(false);
  }

  return (
    <Section
      icon={user.totpEnabled ? ShieldCheck : ShieldOff}
      title="Two-step verification"
      description="Require a code from an authenticator app (Google Authenticator, 1Password, Authy…) when you sign in."
    >
      {user.totpEnabled ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-medium text-primary"><Check className="size-4" /> Enabled</p>
          <p className="text-sm text-muted-foreground">{user.recoveryLeft} recovery {user.recoveryLeft === 1 ? "code" : "codes"} left.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setRegenOpen(true)}>New recovery codes</Button>
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDisableOpen(true)}>Turn off</Button>
          </div>
        </div>
      ) : (
        <Button onClick={start} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Set up authenticator</Button>
      )}

      <SetupDialog
        data={setup}
        onClose={() => setSetup(null)}
        onEnabled={(u, rc) => { onChange(u); setSetup(null); setCodes(rc); notify.success("Two-step verification is on"); }}
      />
      <RecoveryDialog codes={codes} onClose={() => setCodes(null)} />
      <CodeDialog
        open={regenOpen}
        onClose={() => setRegenOpen(false)}
        title="New recovery codes"
        description="Your old codes will stop working. Enter a code from your authenticator to continue."
        action="Generate"
        onSubmit={async (code) => {
          const r = await api<{ user: PublicUser; recoveryCodes: string[] }>("/api/account/2fa/recovery", { method: "POST", body: { code } });
          onChange(r.user);
          setRegenOpen(false);
          setCodes(r.recoveryCodes);
        }}
      />
      <CodeDialog
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
        title="Turn off two-step verification"
        description="Your account will be protected by your password alone."
        action="Turn off"
        destructive
        askPassword={user.hasPassword}
        onSubmit={async (code, password) => {
          const r = await api<{ user: PublicUser }>("/api/account/2fa/disable", { method: "POST", body: { code, password } });
          onChange(r.user);
          setDisableOpen(false);
          notify.success("Two-step verification is off");
        }}
      />
    </Section>
  );
}

function SetupDialog({ data, onClose, onEnabled }: { data: { qr: string; secret: string } | null; onClose: () => void; onEnabled: (u: PublicUser, codes: string[]) => void }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  async function verify(code: string) {
    setLoading(true);
    setError("");
    try {
      const r = await api<{ user: PublicUser; recoveryCodes: string[] }>("/api/account/2fa/enable", { method: "POST", body: { code } });
      onEnabled(r.user, r.recoveryCodes);
    } catch (err) {
      setError((err as Error).message);
      setAttempt((n) => n + 1);
    }
    setLoading(false);
  }

  return (
    <Dialog open={!!data} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Set up authenticator" description="Scan the QR code, then enter the code">
        {data && (
          <div className="space-y-4">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Open your authenticator app and add a new account.</li>
              <li>Scan this QR code (or enter the key by hand).</li>
              <li>Type the 6-digit code it shows.</li>
            </ol>
            <div className="flex flex-col items-center gap-2">
              {/* QR codes need a white background to scan reliably in dark mode */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.qr} alt="QR code for your authenticator app" className="size-44 rounded-xl bg-white p-2" />
              <button
                onClick={() => navigator.clipboard.writeText(data.secret).then(() => notify.success("Key copied"))}
                className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 font-mono text-xs tracking-wider hover:bg-muted/70"
                title="Copy setup key"
              >
                {data.secret.match(/.{1,4}/g)?.join(" ")} <Copy className="size-3.5" />
              </button>
            </div>
            <OtpInput onComplete={verify} disabled={loading} autoFocus resetKey={attempt} />
            {error && <p role="alert" className="text-center text-sm text-destructive">{error}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RecoveryDialog({ codes, onClose }: { codes: string[] | null; onClose: () => void }) {
  const text = codes?.join("\n") ?? "";
  return (
    <Dialog open={!!codes} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title="Save your recovery codes"
        description="One-time recovery codes"
        footer={<Button onClick={onClose}>I&apos;ve saved them</Button>}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <p className="mb-3 text-sm text-muted-foreground">
          If you lose your phone, each of these codes can be used once to sign in. They won&apos;t be shown again, so keep them somewhere safe.
        </p>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-4 font-mono text-sm">
          {codes?.map((c) => <span key={c}>{c}</span>)}
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" onClick={() => navigator.clipboard.writeText(text).then(() => notify.success("Codes copied"))}><Copy /> Copy</Button>
          <Button
            variant="secondary"
            onClick={() => {
              const a = document.createElement("a");
              a.href = URL.createObjectURL(new Blob([`ToDo App recovery codes\n\n${text}\n`], { type: "text/plain" }));
              a.download = "todo-app-recovery-codes.txt";
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            <Download /> Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Asks for an authenticator code (and optionally the password) before a sensitive action. */
function CodeDialog({ open, onClose, title, description, action, destructive, askPassword, onSubmit }: {
  open: boolean; onClose: () => void; title: string; description: string; action: string; destructive?: boolean; askPassword?: boolean;
  onSubmit: (code: string, password: string) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const close = () => { setCode(""); setPassword(""); setError(""); onClose(); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onSubmit(code.replace(/\s/g, ""), password);
      setCode(""); setPassword("");
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent title={title} description={description}>
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm text-muted-foreground">{description}</p>
          {askPassword && (
            <div className="space-y-1.5">
              <Label htmlFor="cd-pw">Password</Label>
              <Input id="cd-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="cd-code">Authenticator code</Label>
            <Input id="cd-code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" maxLength={7} required />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={close}>Cancel</Button>
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={loading}>{loading && <Loader2 className="animate-spin" />}{action}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- delete ------------------------------- */
function DeleteSection({ user, onDeleted }: { user: PublicUser; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function remove() {
    setLoading(true);
    setError("");
    try {
      await api("/api/account", { method: "DELETE", body: { confirm, password } });
      onDeleted();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <Section icon={Trash2} title="Delete account" description="Permanently remove your account and every todo in it. This can't be undone." danger>
      <Button variant="destructive" onClick={() => setOpen(true)}>Delete my account</Button>
      <AlertDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setConfirm(""); setPassword(""); setError(""); } }}>
        <AlertDialogContent
          title="Delete your account?"
          footer={
            <>
              <AlertDialogCancel asChild><Button variant="secondary">Cancel</Button></AlertDialogCancel>
              <Button variant="destructive" disabled={loading || confirm.trim().toLowerCase() !== user.email} onClick={remove}>
                {loading && <Loader2 className="animate-spin" />} Delete forever
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Type <span className="font-medium text-foreground">{user.email}</span> to confirm.
            </p>
            <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={user.email} aria-label="Confirm email" />
            {user.hasPassword && (
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" aria-label="Password" autoComplete="current-password" />
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}
