/** Calm backdrop: a soft glow at the top and a faint dot grid. Pure CSS. */
export default function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-background">
      <div className="absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(60%_100%_at_50%_0%,hsl(var(--primary)/0.16),transparent)]" />
      <div
        className="absolute inset-0 opacity-60 [mask-image:radial-gradient(70%_55%_at_50%_20%,#000,transparent)]"
        style={{ backgroundImage: "radial-gradient(hsl(var(--foreground)/0.14) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      />
    </div>
  );
}
