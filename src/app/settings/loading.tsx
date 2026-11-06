import Logo from "@/components/Logo";

/** Shown instantly while the settings page is being fetched, so a click never looks like it did nothing. */
function Card({ rows, tall }: { rows: number; tall?: boolean }) {
  return (
    <div className="surface animate-soft-pulse space-y-4 p-5">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-xl bg-muted" />
        <div className="space-y-2">
          <div className="h-4 w-36 rounded bg-muted" />
          <div className="h-3 w-56 max-w-full rounded-full bg-muted/70" />
        </div>
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`${tall && i === 0 ? "h-28" : "h-10"} rounded-xl bg-muted/70`} />
      ))}
      <div className="h-10 w-32 rounded-xl bg-muted" />
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <main aria-busy="true" aria-label="Loading settings" className="mx-auto max-w-2xl px-3 pb-24 pt-5 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="h-10 w-36 animate-soft-pulse rounded-xl bg-muted/70" />
        <div className="size-10 animate-soft-pulse rounded-xl bg-muted/70" />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Logo className="size-9" />
        <div className="space-y-2">
          <h1 className="heading text-2xl">Account settings</h1>
          <div className="h-3 w-40 animate-soft-pulse rounded-full bg-muted/70" />
        </div>
      </div>
      <div className="mt-6 space-y-4">
        <Card rows={2} />
        <Card rows={3} />
        <Card rows={1} />
        <Card rows={2} />
        <Card rows={3} tall />
      </div>
    </main>
  );
}
