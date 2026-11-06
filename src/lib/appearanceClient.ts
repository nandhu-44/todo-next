import { APPEARANCE_COOKIE, accentHexes, appearanceCss, iconUrl, parseAppearance, type Appearance } from "./appearance";

/**
 * Applies an appearance to the page immediately (live preview). Doesn't save anything.
 *
 * Important: this must never remove or replace nodes that React/Next render into <head> (the icon link, the
 * theme-color metas, the server-rendered #appearance style). Next updates those during navigation, and if one has
 * vanished the page transition throws ("removeChild of null") and the old page stays on screen. So live styles go
 * into a style element this code owns, and existing nodes are only edited in place.
 */
export function applyAppearance(a: Appearance) {
  let el = document.getElementById("appearance-live");
  if (!el) {
    el = document.createElement("style");
    el.id = "appearance-live";
    document.head.appendChild(el);
  }
  el.textContent = appearanceCss(a); // same selectors as the server-rendered style and later in the page, so it wins

  // Browser-tab icon and mobile browser bar follow the theme. Next streams its own metadata into <head> (sometimes after
  // this runs, with the colour for whatever cookie the server saw), so the correct values are re-applied whenever
  // those elements appear or change. Only attributes are edited; nothing is ever removed.
  wanted = { icon: iconUrl(a), ...accentHexes(a) };
  syncHead();
  if (!observer) {
    observer = new MutationObserver(syncHead);
    observer.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ["href", "content"] });
  }
}

let wanted: { icon: string; light: string; dark: string } | null = null;
let observer: MutationObserver | null = null;

function syncHead() {
  if (!wanted) return;
  document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]').forEach((l) => {
    if (l.getAttribute("href") !== wanted!.icon) l.setAttribute("href", wanted!.icon);
  });
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const color = m.media.includes("dark") ? wanted!.dark : wanted!.light;
    if (m.getAttribute("content") !== color) m.setAttribute("content", color);
  });
}

export function writeAppearanceCookie(a: Appearance) {
  document.cookie = `${APPEARANCE_COOKIE}=${encodeURIComponent(JSON.stringify(a))}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function readAppearanceCookie(): Appearance | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${APPEARANCE_COOKIE}=([^;]*)`));
  if (!m) return null;
  try {
    return parseAppearance(JSON.parse(decodeURIComponent(m[1])));
  } catch {
    return null;
  }
}
