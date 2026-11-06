"use client";

/** Thin indeterminate bar at the top of the screen: instant feedback while a page is being fetched. */
export function ProgressBar() {
  return (
    <div role="progressbar" aria-label="Loading page" className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5 overflow-hidden bg-primary/15">
      <div className="h-full w-1/3 animate-[nav-progress_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
    </div>
  );
}
