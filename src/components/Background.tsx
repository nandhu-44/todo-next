/** Fixed aurora backdrop: drifting colour blobs over a faint grid. Pure CSS, no JS. */
export default function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-sky-50 via-indigo-50 to-fuchsia-50 dark:from-[#0a0d1f] dark:via-[#0d1030] dark:to-[#140a2b]" />
      <div className="absolute -left-40 -top-40 size-[34rem] animate-float rounded-full bg-sky-400/40 blur-3xl dark:bg-sky-500/25" />
      <div className="absolute -right-32 top-1/4 size-[30rem] animate-float-slow rounded-full bg-fuchsia-400/30 blur-3xl dark:bg-fuchsia-500/20" />
      <div className="absolute -bottom-40 left-1/4 size-[32rem] animate-float rounded-full bg-emerald-300/30 blur-3xl [animation-delay:-8s] dark:bg-emerald-400/15" />
      <div className="aurora-grid absolute inset-0" />
    </div>
  );
}
