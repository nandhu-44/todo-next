import { APPEARANCE_COOKIE, accentHexes, appearanceCss, iconUrl, parseAppearance, type Appearance } from "./appearance";

/** Applies an appearance to the page immediately (live preview). Doesn't save anything. */
export function applyAppearance(a: Appearance) {
  let el = document.getElementById("appearance");
  if (!el) {
    el = document.createElement("style");
    el.id = "appearance";
    document.head.appendChild(el);
  }
  el.textContent = appearanceCss(a);

  // keep the browser-tab icon and the mobile browser bar in the theme's colour too
  document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]').forEach((l) => l.remove());
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = iconUrl(a);
  document.head.appendChild(link);
  const { light, dark } = accentHexes(a);
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = m.media.includes("dark") ? dark : light;
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
