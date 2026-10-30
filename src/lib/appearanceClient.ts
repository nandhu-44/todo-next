import { APPEARANCE_COOKIE, appearanceCss, parseAppearance, type Appearance } from "./appearance";

/** Applies an appearance to the page immediately (live preview). Doesn't save anything. */
export function applyAppearance(a: Appearance) {
  let el = document.getElementById("appearance");
  if (!el) {
    el = document.createElement("style");
    el.id = "appearance";
    document.head.appendChild(el);
  }
  el.textContent = appearanceCss(a);
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
