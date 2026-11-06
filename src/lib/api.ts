/** Thin fetch wrapper: JSON in/out, throws Error(message) on non-2xx. */
export async function api<T = unknown>(url: string, init?: Omit<RequestInit, "body"> & { body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: string }).error;
    // the full response body rides along so callers can read extra flags (e.g. captchaRequired)
    throw Object.assign(new Error(typeof message === "string" ? message : "Something went wrong"), { data, status: res.status });
  }
  return data as T;
}
