const HEX = /^[0-9a-f]{6}$/i;

/** The app mark as an SVG favicon in the given accent colours (light / dark browser themes). */
export function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const light = HEX.test(q.get("l") ?? "") ? q.get("l")! : "b6502b";
  const dark = HEX.test(q.get("d") ?? "") ? q.get("d")! : light;
  // mark colour flips with the browser theme: the tab bar is dark when the browser is in dark mode
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><style>.t{fill:#${light}}.c{stroke:#fff}@media (prefers-color-scheme:dark){.t{fill:#${dark}}.c{stroke:#1c1916}}</style><rect class="t" width="32" height="32" rx="9"/><path class="c" d="M9 16.5l4.8 4.8L23 11.5" fill="none" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=31536000, immutable" } });
}
