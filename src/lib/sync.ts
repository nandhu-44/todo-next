import type { Todo } from "./types";

/**
 * Three-way merge used by "local-only" mode.
 *
 *   base   = the server's todos as of this device's last sync
 *   local  = this device's todos now
 *   server = the server's todos now (possibly changed by other devices)
 *
 * Comparing each side against `base` tells us who actually changed what, so edits on different
 * devices combine instead of overwriting each other. Rules, per todo:
 *   - changed on one side only          -> that change wins
 *   - changed on both sides differently -> the more recent `updatedAt` wins (counted as a conflict)
 *   - deleted on one side, edited on the other -> the edit wins (a delete never discards newer work)
 *   - deleted on one side, untouched on the other -> the delete is applied
 * Manual order: if this device reordered, its order is used; otherwise the server's order is kept.
 */

export interface MergeStats {
  pushed: number; // changes sent to the server
  pulled: number; // changes received from the server
  conflicts: number; // both sides changed the same todo (newest edit kept)
}

export interface MergeResult {
  merged: Todo[]; // final state, ordered, `order` renumbered 0..n-1
  toInsert: Todo[];
  toUpdate: Todo[];
  toDelete: string[];
  stats: MergeStats;
}

const sameTags = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join("\n") === [...b].sort().join("\n");

export const sameContent = (a: Todo, b: Todo) =>
  a.title === b.title &&
  a.description === b.description &&
  a.completed === b.completed &&
  a.priority === b.priority &&
  a.dueDate === b.dueDate &&
  sameTags(a.tags, b.tags);

const byOrder = (a: Todo, b: Todo) => a.order - b.order || a.createdAt.localeCompare(b.createdAt);
const map = (l: Todo[]) => new Map(l.map((t) => [t.id, t]));

export function merge(base: Todo[], local: Todo[], server: Todo[], now = new Date().toISOString()): MergeResult {
  const B = map(base), L = map(local), S = map(server);
  const stats: MergeStats = { pushed: 0, pulled: 0, conflicts: 0 };
  const finals = new Map<string, Todo>();
  const toDelete: string[] = [];
  const clamp = (t: Todo): Todo => (t.updatedAt > now ? { ...t, updatedAt: now } : t); // distrust future-dated device clocks

  for (const id of new Set([...B.keys(), ...L.keys(), ...S.keys()])) {
    const b = B.get(id), l = L.get(id), s = S.get(id);
    const lc = l && (!b || !sameContent(l, b)); // changed locally since last sync
    const sc = s && (!b || !sameContent(s, b)); // changed on the server since last sync

    if (l && s) {
      if (!lc && !sc) finals.set(id, s);
      else if (lc && !sc) (finals.set(id, { ...clamp(l), order: s.order }), stats.pushed++);
      else if (!lc && sc) (finals.set(id, s), stats.pulled++);
      else if (sameContent(l, s)) finals.set(id, s); // both made the identical change
      else {
        stats.conflicts++;
        if (clamp(l).updatedAt > s.updatedAt) (finals.set(id, { ...clamp(l), order: s.order }), stats.pushed++);
        else (finals.set(id, s), stats.pulled++);
      }
    } else if (l && !s) {
      if (!b) (finals.set(id, clamp(l)), stats.pushed++); // created here
      else if (lc) (finals.set(id, clamp(l)), stats.conflicts++, stats.pushed++); // deleted elsewhere but edited here: keep it
      else stats.pulled++; // deleted elsewhere and untouched here: drop it locally
    } else if (!l && s) {
      if (!b) (finals.set(id, s), stats.pulled++); // created elsewhere
      else if (sc) (finals.set(id, s), stats.conflicts++, stats.pulled++); // deleted here but edited elsewhere: keep it
      else (toDelete.push(id), stats.pushed++); // deleted here and untouched elsewhere: delete on the server
    }
  }

  // --- ordering ---
  const common = local.filter((t) => B.has(t.id));
  const seqLocal = [...common].sort(byOrder).map((t) => t.id).join();
  const seqBase = [...common].sort((x, y) => byOrder(B.get(x.id)!, B.get(y.id)!)).map((t) => t.id).join();
  const localReordered = seqLocal !== seqBase;

  const all = [...finals.values()];
  let ordered: Todo[];
  if (localReordered) {
    // this device's order for everything it knows about; todos only the server has go on top
    const serverOnly = all.filter((t) => !L.has(t.id)).sort(byOrder);
    const known = all.filter((t) => L.has(t.id)).sort((x, y) => byOrder(L.get(x.id)!, L.get(y.id)!));
    ordered = [...serverOnly, ...known];
  } else {
    // keep the server's order; brand-new todos from this device go on top, and a todo kept despite
    // being deleted elsewhere returns to its old position (its order value comes from this device)
    const created = all.filter((t) => !S.has(t.id) && !B.has(t.id)).sort((x, y) => byOrder(L.get(x.id)!, L.get(y.id)!));
    const known = all
      .filter((t) => S.has(t.id) || B.has(t.id))
      .sort((x, y) => (S.get(x.id) ?? L.get(x.id)!).order - (S.get(y.id) ?? L.get(y.id)!).order);
    ordered = [...created, ...known];
  }
  const merged = ordered.map((t, i) => ({ ...t, order: i }));

  const toInsert: Todo[] = [], toUpdate: Todo[] = [];
  for (const t of merged) {
    const s = S.get(t.id);
    if (!s) toInsert.push(t);
    else if (!sameContent(t, s) || t.order !== s.order || t.updatedAt !== s.updatedAt) toUpdate.push(t);
  }
  if (localReordered) stats.pushed++;
  return { merged, toInsert, toUpdate, toDelete, stats };
}

/** How many changes `local` has that the server hasn't seen yet (for the "unsynced" badge). */
export function countPending(base: Todo[], local: Todo[]): number {
  const B = map(base), L = map(local);
  let n = 0;
  for (const t of local) {
    const b = B.get(t.id);
    if (!b || !sameContent(t, b)) n++;
  }
  for (const t of base) if (!L.has(t.id)) n++;
  const common = local.filter((t) => B.has(t.id));
  const a = [...common].sort(byOrder).map((t) => t.id).join();
  const c = [...common].sort((x, y) => byOrder(B.get(x.id)!, B.get(y.id)!)).map((t) => t.id).join();
  return n + (a !== c ? 1 : 0);
}
