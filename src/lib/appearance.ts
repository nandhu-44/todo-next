/**
 * Per-account appearance: font, colour theme and corner radius.
 * Pure functions only, so the server (first paint) and the browser (live preview) generate identical CSS.
 */

/* ------------------------------- fonts ------------------------------- */
export const FONTS = [
  { id: "lilita-poppins", name: "Lilita One + Poppins", note: "Chunky display headings, friendly body", heading: "'Lilita One', sans-serif", body: "'Poppins', sans-serif", weight: 400, tracking: "0.025em" },
  { id: "fraunces-public-sans", name: "Fraunces + Public Sans", note: "Warm editorial serif headings, clean sans body", heading: "'Fraunces', serif", body: "'Public Sans', sans-serif", weight: 600, tracking: "-0.01em" },
  { id: "plex-sans", name: "IBM Plex Sans", note: "Sturdy, technical and neutral", heading: "'IBM Plex Sans', sans-serif", body: "'IBM Plex Sans', sans-serif", weight: 600, tracking: "-0.01em" },
  { id: "literata", name: "Literata", note: "A calm reading serif", heading: "'Literata', serif", body: "'Literata', serif", weight: 700, tracking: "-0.01em" },
  { id: "atkinson", name: "Atkinson Hyperlegible Next", note: "Designed for maximum legibility", heading: "'Atkinson Hyperlegible Next', sans-serif", body: "'Atkinson Hyperlegible Next', sans-serif", weight: 700, tracking: "0" },
  { id: "jetbrains-mono", name: "JetBrains Mono", note: "Monospace, notebook feel", heading: "'JetBrains Mono', monospace", body: "'JetBrains Mono', monospace", weight: 700, tracking: "-0.03em" },
] as const;
export type FontId = (typeof FONTS)[number]["id"];

/* ------------------------------- themes ------------------------------- */
/** A theme is an accent colour plus the hue/strength of the tinted surfaces. Light and dark palettes are derived from it. */
export interface ThemeParams {
  accent: string; // #rrggbb
  hue: number; // 0-360, tint of backgrounds / borders
  tint: number; // 0-40, how strongly surfaces are tinted (0 = neutral grey)
}

export const PRESETS = {
  terracotta: { name: "Terracotta", note: "Warm clay on cream", accent: "#b6502b", hue: 40, tint: 30 },
  moss: { name: "Moss", note: "Deep green on sage paper", accent: "#2f6a4a", hue: 95, tint: 18 },
  harbor: { name: "Harbor", note: "Ink blue on sea fog", accent: "#2c5d94", hue: 210, tint: 14 },
  saffron: { name: "Saffron", note: "Golden spice on butter", accent: "#a8700a", hue: 45, tint: 34 },
  rosewood: { name: "Rosewood", note: "Dusty burgundy on blush", accent: "#98334a", hue: 12, tint: 26 },
  graphite: { name: "Graphite", note: "Quiet monochrome", accent: "#3b3835", hue: 30, tint: 5 },
} as const satisfies Record<string, ThemeParams & { name: string; note: string }>;
export type PresetId = keyof typeof PRESETS;
export const PRESET_IDS = Object.keys(PRESETS) as PresetId[];

export interface Appearance {
  font: FontId;
  theme: PresetId | "custom";
  custom: ThemeParams;
  radius: number; // px, 0-20 (default 12)
}

export const DEFAULT_APPEARANCE: Appearance = {
  font: "lilita-poppins",
  theme: "terracotta",
  custom: { accent: "#7a5af8", hue: 250, tint: 14 },
  radius: 12,
};

export const APPEARANCE_COOKIE = "todo_appearance";

/** Validates anything (cookie JSON, request body) into a safe Appearance; unknown values fall back to defaults. */
export function parseAppearance(raw: unknown): Appearance {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const c = (r.custom && typeof r.custom === "object" ? r.custom : {}) as Record<string, unknown>;
  const num = (v: unknown, min: number, max: number, d: number) => (typeof v === "number" && isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : d);
  const d = DEFAULT_APPEARANCE;
  return {
    font: FONTS.some((f) => f.id === r.font) ? (r.font as FontId) : d.font,
    theme: r.theme === "custom" || PRESET_IDS.includes(r.theme as PresetId) ? (r.theme as Appearance["theme"]) : d.theme,
    custom: {
      accent: typeof c.accent === "string" && /^#[0-9a-f]{6}$/i.test(c.accent) ? c.accent.toLowerCase() : d.custom.accent,
      hue: num(c.hue, 0, 360, d.custom.hue),
      tint: num(c.tint, 0, 40, d.custom.tint),
    },
    radius: num(r.radius, 0, 20, d.radius),
  };
}

export const sameAppearance = (a: Appearance, b: Appearance) => JSON.stringify(parseAppearance(a)) === JSON.stringify(parseAppearance(b));
export const themeParams = (a: Appearance): ThemeParams => (a.theme === "custom" ? a.custom : PRESETS[a.theme]);

/* ------------------------------- colour maths ------------------------------- */
export function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, dlt = max - min;
  if (dlt === 0) return [0, 0, l * 100];
  const s = dlt / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / dlt) % 6 : max === g ? (b - r) / dlt + 2 : (r - g) / dlt + 4;
  return [(h * 60 + 360) % 360, s * 100, l * 100];
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}
const luminance = ([r, g, b]: number[]) => {
  const c = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: number[], b: number[]) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

/** Darkens (light mode) or lightens (dark mode) the accent until text on it is readable (WCAG AA, 4.5:1). */
function readableAccent(h: number, s: number, l: number, dark: boolean, textRgb: number[]) {
  let lightness = dark ? Math.max(l, 56) : Math.min(l, 46);
  // 4.7 target leaves headroom for rounding of the generated HSL strings
  for (let i = 0; i < 80 && contrast(hslToRgb(h, s, lightness), textRgb) < 4.7; i++) lightness += dark ? 0.5 : -0.5;
  return Math.max(6, Math.min(94, lightness));
}

/** WCAG contrast ratio between two token values like "16 62% 44%". */
export function contrastOfTokens(a: string, b: string): number {
  const rgb = (t: string) => { const [h, s, l] = t.replace(/%/g, "").split(" ").map(Number); return hslToRgb(h, s, l); };
  return contrast(rgb(a), rgb(b));
}

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
const hsl = (h: number, s: number, l: number) => `${Math.round(h)} ${Math.round(clamp(s))}% ${Math.round(l * 10) / 10}%`;

export type Tokens = Record<string, string>;

/** Builds the full set of CSS colour tokens for one mode from a theme's three parameters. */
export function tokens(p: ThemeParams, dark: boolean): Tokens {
  const [ah, as] = hexToHsl(p.accent), al = hexToHsl(p.accent)[2];
  const sh = p.hue, S = p.tint;
  if (!dark) {
    const white = hslToRgb(sh, 40, 98); // the actual text colour used on accent buttons
    return {
      "--background": hsl(sh, S * 1.1, 96),
      "--foreground": hsl(sh, S * 0.7, 13),
      "--card": hsl(sh, S * 1.3, 99),
      "--popover": hsl(sh, S * 1.3, 99),
      "--muted": hsl(sh, S * 0.75, 90),
      "--muted-foreground": hsl(sh, S * 0.35, 38),
      "--border": hsl(sh, S * 0.6, 83),
      "--primary": hsl(ah, as, readableAccent(ah, as, al, false, white)),
      "--primary-foreground": hsl(sh, 40, 98),
      "--destructive": "355 66% 42%",
      "--p-high": "16 62% 48%",
      "--p-medium": "40 68% 46%",
      "--p-low": "150 14% 48%",
    };
  }
  const ink = hslToRgb(sh, S * 0.5, 9);
  return {
    "--background": hsl(sh, S * 0.25, 11),
    "--foreground": hsl(sh, S * 0.8, 91),
    "--card": hsl(sh, S * 0.25, 14.5),
    "--popover": hsl(sh, S * 0.25, 16),
    "--muted": hsl(sh, S * 0.2, 20),
    "--muted-foreground": hsl(sh, S * 0.3, 66),
    "--border": hsl(sh, S * 0.2, 24),
    "--primary": hsl(ah, as, readableAccent(ah, as, al, true, ink)),
    "--primary-foreground": hsl(sh, S * 0.5, 9),
    "--destructive": "355 72% 64%",
    "--p-high": "16 68% 60%",
    "--p-medium": "40 70% 56%",
    "--p-low": "150 16% 58%",
  };
}

/** "16 62% 44%" -> "#b6502b" */
export function tokenToHex(token: string): string {
  const [h, s, l] = token.replace(/%/g, "").split(" ").map(Number);
  return "#" + hslToRgb(h, s, l).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

/** The accent colour in light and dark mode, as hex (used for the favicon and the browser theme colour). */
export function accentHexes(a: Appearance): { light: string; dark: string } {
  const p = themeParams(a);
  return { light: tokenToHex(tokens(p, false)["--primary"]), dark: tokenToHex(tokens(p, true)["--primary"]) };
}

/** URL of the favicon for an appearance; the route renders the app mark in these colours. */
export function iconUrl(a: Appearance): string {
  const { light, dark } = accentHexes(a);
  return `/api/icon?l=${light.slice(1)}&d=${dark.slice(1)}`;
}

const decl = (t: Tokens) => Object.entries(t).map(([k, v]) => `${k}:${v}`).join(";");

/** The stylesheet that applies an appearance. Higher specificity than the defaults in globals.css, so order doesn't matter. */
export function appearanceCss(a: Appearance): string {
  const f = FONTS.find((x) => x.id === a.font)!;
  const p = themeParams(a);
  const shared = `--radius:${a.radius}px;--font-heading:${f.heading};--font-body:${f.body};--heading-weight:${f.weight};--heading-tracking:${f.tracking}`;
  return `:root:root{${shared};${decl(tokens(p, false))}}html.dark:root{${decl(tokens(p, true))}}`;
}
