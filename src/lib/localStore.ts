import { api } from "./api";
import type { MergeStats } from "./sync";
import type { Todo } from "./types";

/**
 * "Local-only" mode keeps a user's todos in this browser. The presence of the entry means the mode is on.
 *   todos      working copy, edited freely without touching the server
 *   base       the server's todos as of the last sync (lets the server tell what changed where)
 *   lastSyncAt when the last successful sync finished
 */
export interface LocalState {
  todos: Todo[];
  base: Todo[];
  lastSyncAt: string | null;
}

const key = (userId: string) => `todo-next:local:${userId}`;

export function readLocal(userId: string): LocalState | null {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return null;
    const s = JSON.parse(raw);
    return Array.isArray(s?.todos) && Array.isArray(s?.base) ? { todos: s.todos, base: s.base, lastSyncAt: s.lastSyncAt ?? null } : null;
  } catch {
    return null;
  }
}

/** Returns false if the browser refused the write (private mode, quota). */
export function writeLocal(userId: string, state: LocalState): boolean {
  try {
    localStorage.setItem(key(userId), JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearLocal(userId: string) {
  try {
    localStorage.removeItem(key(userId));
  } catch {}
}

export function storageAvailable(): boolean {
  try {
    const k = "todo-next:probe";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/** Turn local-only mode on, starting from a copy of what's on the server. */
export async function enableLocalMode(userId: string): Promise<LocalState> {
  if (!storageAvailable()) throw new Error("This browser isn't allowing local storage, so local-only mode can't be used.");
  const { todos } = await api<{ todos: Todo[] }>("/api/todos");
  const state: LocalState = { todos, base: todos, lastSyncAt: new Date().toISOString() };
  if (!writeLocal(userId, state)) throw new Error("Couldn't save to this browser's storage.");
  return state;
}

/** Merge this device's changes with the server (see lib/sync.ts) and store the result. */
export async function syncNow(userId: string, current: LocalState): Promise<{ state: LocalState; stats: MergeStats }> {
  const r = await api<{ todos: Todo[]; stats: MergeStats; syncedAt: string }>("/api/todos/sync", {
    method: "POST",
    body: { base: current.base, local: current.todos },
  });
  const state: LocalState = { todos: r.todos, base: r.todos, lastSyncAt: r.syncedAt };
  writeLocal(userId, state);
  return { state, stats: r.stats };
}

export function syncSummary(s: MergeStats): string {
  if (!s.pushed && !s.pulled && !s.conflicts) return "Already up to date";
  const parts = [`${s.pushed} sent`, `${s.pulled} received`];
  if (s.conflicts) parts.push(`${s.conflicts} ${s.conflicts === 1 ? "conflict" : "conflicts"} resolved (newest edit kept)`);
  return `Synced: ${parts.join(", ")}`;
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}
