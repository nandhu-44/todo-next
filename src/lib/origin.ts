/** Public origin of the current request (honours reverse-proxy headers), e.g. https://todo.example.com */
export function requestOrigin(req: Request): string {
  const h = req.headers;
  const host = h.get("x-forwarded-host") || h.get("host");
  if (!host) return new URL(req.url).origin;
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() || new URL(req.url).protocol.replace(":", "");
  return `${proto}://${host.split(",")[0].trim()}`;
}
